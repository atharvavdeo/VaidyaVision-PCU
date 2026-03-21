"""Quick test of the unified ClinicalAIDiagnosticSystem model."""
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
import timm
import numpy as np
import cv2
from PIL import Image
from torchvision import transforms

# ── Model Definitions ──────────────────────────────────────────────
class BrainExpert(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.backbone = timm.create_model('efficientnet_b2', pretrained=False, num_classes=0, global_pool='avg')
        self.fc = nn.Sequential(
            nn.Linear(1408, 512), nn.BatchNorm1d(512), nn.Hardswish(),
            nn.Dropout(p=0.4), nn.Linear(512, num_classes)
        )
    def forward(self, x):
        return self.fc(self.backbone(x))

class LungExpert(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.backbone = models.densenet121(weights=None)
        num_ftrs = self.backbone.classifier.in_features
        self.backbone.classifier = nn.Identity()
        self.head = nn.Sequential(
            nn.Linear(num_ftrs, 512), nn.BatchNorm1d(512), nn.ReLU(),
            nn.Dropout(p=0.3), nn.Linear(512, num_classes)
        )
    def forward(self, x):
        return self.head(self.backbone(x))

class SkinExpert(nn.Module):
    def __init__(self, num_classes=9):
        super().__init__()
        self.backbone = models.resnet50(weights=None)
        num_ftrs = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.head = nn.Sequential(
            nn.Linear(num_ftrs, 512), nn.BatchNorm1d(512), nn.ReLU(),
            nn.Dropout(p=0.45), nn.Linear(512, num_classes)
        )
    def forward(self, x):
        return self.head(self.backbone(x))

class ECGExpert(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.backbone = timm.create_model('efficientnet_b0', pretrained=False, num_classes=0)
        self.head = nn.Sequential(
            nn.Linear(1280, 512), nn.BatchNorm1d(512), nn.ReLU(),
            nn.Dropout(p=0.3), nn.Linear(512, num_classes)
        )
    def forward(self, x):
        return self.head(self.backbone(x))

class ModalityRouter(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = models.resnet34(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, 4)
    def forward(self, x):
        return self.model(x)

class ClinicalAIDiagnosticSystem(nn.Module):
    def __init__(self, class_counts):
        super().__init__()
        self.router = ModalityRouter()
        self.experts = nn.ModuleDict({
            'brain': BrainExpert(class_counts['brain']),
            'lung': LungExpert(class_counts['lung']),
            'skin': SkinExpert(class_counts['skin']),
            'ecg': ECGExpert(class_counts['ecg'])
        })
        self.labels = {0: 'brain', 1: 'lung', 2: 'skin', 3: 'ecg'}

    def perform_inference(self, x, samples=25, threshold=0.15):
        self.router.eval()
        with torch.no_grad():
            modality_idx = torch.argmax(self.router(x), dim=1).item()
            modality = self.labels[modality_idx]
        expert = self.experts[modality]
        expert.eval()
        for m in expert.modules():
            if isinstance(m, nn.Dropout):
                m.train()
        stochastic_preds = []
        with torch.no_grad():
            for _ in range(samples):
                stochastic_preds.append(F.softmax(expert(x), dim=1))
        preds_tensor = torch.stack(stochastic_preds)
        mean_prediction = preds_tensor.mean(dim=0)
        uncertainty = preds_tensor.std(dim=0).mean().item()
        conf, class_idx = torch.max(mean_prediction, dim=1)
        if uncertainty > threshold:
            return {"status": "REJECTED", "reason": "High Uncertainty", "score": uncertainty, "modality": modality}
        return {
            "status": "ACCEPTED", "modality": modality,
            "diagnosis": class_idx.item(), "confidence": conf.item(),
            "uncertainty": uncertainty
        }

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

# ── Class labels ────────────────────────────────────────────────────
CLASS_MAP = {
    'brain': ['Glioma', 'Meningioma', 'No Tumor', 'Pituitary'],
    'lung': ['Bacterial Pneumonia', 'COVID-19', 'Normal', 'Tuberculosis', 'Viral Pneumonia'],
    'skin': ['Actinic keratosis', 'Atopic Dermatitis', 'Benign keratosis', 'Dermatofibroma',
             'Melanocytic nevus', 'Melanoma', 'Squamous cell carcinoma', 'Tinea Ringworm', 'Vascular lesion'],
    'ecg': ['Abnormal', 'Infarction', 'Normal', 'History of MI']
}

# ── Run ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json, sys

    image_path = "/Users/atharvadeo/Desktop/PROF/Hackies/Hackvision/pneuom.jpeg"
    model_path = "/Users/atharvadeo/Desktop/PROF/Hackies/Hackvision/medical_ai_system_final.pth"

    device = torch.device("cpu")
    configs = {'brain': 4, 'lung': 5, 'skin': 9, 'ecg': 4}

    print("Loading unified model...")
    system = ClinicalAIDiagnosticSystem(configs).to(device)
    system.load_state_dict(torch.load(model_path, map_location=device))
    system.eval()
    print("Model loaded OK")

    img = Image.open(image_path).convert('RGB')
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    input_tensor = transform(img).unsqueeze(0).to(device)

    print("Running inference...")
    report = system.perform_inference(input_tensor)
    modality = report['modality']

    if report['status'] == 'ACCEPTED':
        diagnosis_label = CLASS_MAP[modality][report['diagnosis']]
        report['diagnosis_label'] = diagnosis_label
        print(f"\n{'='*50}")
        print(f"  STATUS:      {report['status']}")
        print(f"  MODALITY:    {modality.upper()}")
        print(f"  DIAGNOSIS:   {diagnosis_label}")
        print(f"  CONFIDENCE:  {report['confidence']*100:.2f}%")
        print(f"  UNCERTAINTY: {report['uncertainty']:.4f}")
        print(f"{'='*50}")

        # GradCAM
        expert = system.experts[modality]
        if modality == 'brain': target = expert.backbone.conv_head
        elif modality == 'lung': target = expert.backbone.features.norm5
        elif modality == 'skin': target = expert.backbone.layer4[-1]
        else: target = expert.backbone.conv_head
        
        cam_engine = GradCAM(expert, target)
        heatmap = cam_engine.generate_heatmap(input_tensor, report['diagnosis'])
        
        img_np = np.array(img.resize((224, 224)))
        heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        overlay = cv2.addWeighted(img_np, 0.6, heatmap_colored, 0.4, 0)
        
        out_path = "/Users/atharvadeo/Desktop/PROF/Hackies/Hackvision/pneuom_gradcam.png"
        overlay_img = Image.fromarray(overlay)
        overlay_img.save(out_path)
        print(f"  GradCAM saved to: {out_path}")
    else:
        print(f"\n  STATUS: {report['status']}")
        print(f"  REASON: {report.get('reason', 'N/A')}")
        print(f"  MODALITY: {modality}")
        print(f"  UNCERTAINTY: {report.get('score', 'N/A')}")
