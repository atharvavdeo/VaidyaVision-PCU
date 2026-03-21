"""
Inference pipeline for VaidyaVision diagnostic system.
Uses a single unified ClinicalAIDiagnosticSystem checkpoint.
Handles model loading, prediction, GradCAM heatmap generation, and MC Dropout uncertainty.
"""

import os
import io
import base64
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

from model_defs import ClinicalAIDiagnosticSystem

# ---- Class labels per modality ----
CLASS_LABELS = {
    'brain': ['Glioma', 'Meningioma', 'No Tumor', 'Pituitary'],
    'lung': ['Bacterial Pneumonia', 'COVID-19', 'Normal', 'Tuberculosis', 'Viral Pneumonia'],
    'ecg': ['Abnormal', 'Infarction', 'Normal', 'History of MI'],
    'skin': [
        'Actinic Keratosis', 'Atopic Dermatitis', 'Benign Keratosis',
        'Dermatofibroma', 'Melanocytic Nevus', 'Melanoma',
        'Squamous Cell Carcinoma', 'Tinea Ringworm', 'Vascular Lesion'
    ],
}

CLASS_COUNTS = {'brain': 4, 'lung': 5, 'skin': 9, 'ecg': 4}

# ImageNet normalization (same as training)
TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ================================================================
# Model loader — unified single-file checkpoint
# ================================================================
_models_loaded = False
_system = None


def load_models(model_path: str):
    """Load the unified ClinicalAIDiagnosticSystem from a single .pth file."""
    global _models_loaded, _system

    if _models_loaded:
        return

    print(f"[INFO] Loading unified model from {model_path} on {DEVICE}...")

    _system = ClinicalAIDiagnosticSystem(CLASS_COUNTS).to(DEVICE)
    _system.load_state_dict(torch.load(model_path, map_location=DEVICE))
    _system.eval()

    print("  ✓ Router loaded")
    for name in _system.experts:
        print(f"  ✓ {name.upper()} expert loaded")

    _models_loaded = True
    print("[INFO] Unified model loaded successfully.")


# ================================================================
# GradCAM for heatmap (matches training notebook implementation)
# ================================================================
class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.hook_layers()

    def hook_layers(self):
        def forward_hook(module, input, output):
            self.activations = output
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0]

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_backward_hook(backward_hook)

    def generate_heatmap(self, input_tensor, class_idx):
        self.model.zero_grad()
        output = self.model(input_tensor)
        score = output[0][class_idx]
        score.backward()

        grads = self.gradients.data.cpu().numpy()[0]
        acts = self.activations.data.cpu().numpy()[0]
        weights = np.mean(grads, axis=(1, 2))

        cam = np.zeros(acts.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * acts[i]

        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        cam = cam - np.min(cam)
        if np.max(cam) > 0:
            cam = cam / np.max(cam)
        return cam


def _get_target_layer(expert, modality: str):
    """Return the correct last conv/norm layer for each architecture (matches training)."""
    try:
        if modality == 'brain':
            return expert.backbone.conv_head
        elif modality == 'lung':
            return expert.backbone.features.norm5
        elif modality == 'skin':
            return expert.backbone.layer4[-1]
        elif modality == 'ecg':
            return expert.backbone.conv_head
    except AttributeError:
        return None


# ================================================================
# Main inference
# ================================================================
def predict(
    image_bytes: bytes,
    force_modality: str | None = None,
    mc_samples: int = 25,
    uncertainty_threshold: float = 0.15,
) -> dict:
    """
    Full inference pipeline using the unified ClinicalAIDiagnosticSystem:
    1. Route image to correct expert (unless modality forced)
    2. MC Dropout uncertainty estimation via perform_inference()
    3. Generate GradCAM heatmap
    """
    if not _models_loaded or _system is None:
        raise RuntimeError("Models not loaded. Call load_models() first.")

    # Preprocess image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = TRANSFORM(img).unsqueeze(0).to(DEVICE)

    # 1. Run unified system inference (router + MC Dropout)
    if force_modality and force_modality in _system.experts:
        # Force modality: run expert directly with MC Dropout
        modality = force_modality
        expert = _system.experts[modality]
        expert.eval()
        for m in expert.modules():
            if isinstance(m, nn.Dropout):
                m.train()

        stochastic_preds = []
        with torch.no_grad():
            for _ in range(mc_samples):
                stochastic_preds.append(F.softmax(expert(x), dim=1))

        preds_tensor = torch.stack(stochastic_preds)
        mean_prediction = preds_tensor.mean(dim=0)
        uncertainty = preds_tensor.std(dim=0).mean().item()
        conf, class_idx = torch.max(mean_prediction, dim=1)

        if uncertainty > uncertainty_threshold:
            report = {
                "status": "REJECTED",
                "reason": "High Uncertainty",
                "modality": modality,
                "score": uncertainty,
            }
        else:
            report = {
                "status": "ACCEPTED",
                "modality": modality,
                "diagnosis": class_idx.item(),
                "confidence": conf.item(),
                "uncertainty": uncertainty,
                "mean_prediction": mean_prediction,
            }
    else:
        # Use built-in router + MC Dropout
        report = _system.perform_inference(x, samples=mc_samples, threshold=uncertainty_threshold)

    modality = report['modality']
    expert = _system.experts[modality]

    # 2. GradCAM
    expert.eval()
    target_layer = _get_target_layer(expert, modality)
    if target_layer is not None:
        x_grad = TRANSFORM(img).unsqueeze(0).to(DEVICE).requires_grad_(True)
        cam_engine = GradCAM(expert, target_layer)
        predicted_class = report.get('diagnosis', 0)
        heatmap = cam_engine.generate_heatmap(x_grad, predicted_class)
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    else:
        heatmap_uint8 = np.zeros((224, 224), dtype=np.uint8)

    # Colorize heatmap and overlay on original
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_colored_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    original_np = np.array(img.resize((224, 224)))
    overlay = cv2.addWeighted(original_np, 0.6, heatmap_colored_rgb, 0.4, 0)

    # Encode overlay as base64 PNG
    overlay_bgr = cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR)
    _, buf = cv2.imencode(".png", overlay_bgr)
    heatmap_b64 = base64.b64encode(buf).decode("utf-8")

    # Handle rejection
    if report['status'] == 'REJECTED':
        return {
            "status": "REJECTED",
            "reason": report.get("reason", "High Uncertainty"),
            "modality": modality,
            "uncertainty": round(report.get("score", report.get("uncertainty", 0)), 4),
            "heatmap_base64": heatmap_b64,
        }

    # Accepted result
    predicted_class = report['diagnosis']
    confidence = report['confidence']
    uncertainty = report['uncertainty']
    mean_prediction = report.get('mean_prediction')

    diagnosis_label = CLASS_LABELS[modality][predicted_class]

    # Triage score: higher confidence + lower uncertainty = higher priority
    triage_score = int((confidence * 70) + ((1 - uncertainty) * 30))

    # Build all_probabilities from mean prediction if available
    all_probs = {}
    if mean_prediction is not None:
        for i in range(len(CLASS_LABELS[modality])):
            all_probs[CLASS_LABELS[modality][i]] = round(mean_prediction[0][i].item(), 4)

    return {
        "status": "ACCEPTED",
        "modality": modality,
        "diagnosis": diagnosis_label,
        "diagnosis_index": predicted_class,
        "confidence": round(confidence, 4),
        "uncertainty": round(uncertainty, 4),
        "triage_score": triage_score,
        "all_probabilities": all_probs,
        "heatmap_base64": heatmap_b64,
    }
