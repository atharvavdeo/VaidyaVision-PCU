import torch
import timm
import cv2
import librosa
import numpy as np
import numpy as np
from pathlib import Path
import torch.nn as nn
import torch.nn.functional as F
from torch.amp import autocast

# ==========================================
# 1. HARDCODED CONFIGURATION (Must match Training)
# ==========================================
class Config:
    seed = 42
    img_size = 256
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # EXACT COPIES FROM TRAINING SCRIPT
    DOMAIN_LABELS = {
        "lungs": ["Bacterial Pneumonia", "Corona Virus Disease", "Normal", "Tuberculosis", "Viral Pneumonia"],
        "brain": ["glioma", "meningioma", "notumor", "pituitary"],
        "eye": ["cataract", "diabetic_retinopathy", "glaucoma", "normal"],
        "skin": ["Actinic keratosis", "Atopic Dermatitis", "Benign keratosis", "Dermatofibroma", 
                 "Melanocytic nevus", "Melanoma", "Squamous cell carcinoma", 
                 "Tinea Ringworm Candidiasis", "Vascular lesion"],
        "ecg": ["abnormal_heartbeat_ecg_images", "myocardial_infarction_ecg_images", 
                "normal_ecg_images", "post_mi_history_ecg_images"],
        "corona": ["Negative", "Positive", "Unknown"]
    }

    domains = list(DOMAIN_LABELS.keys())
    offsets = {}; class_names = []; curr = 0
    for dom in domains:
        offsets[dom] = curr
        for cls in DOMAIN_LABELS[dom]: class_names.append(f"{dom}_{cls}")
        curr += len(DOMAIN_LABELS[dom])
    
    total_classes = len(class_names) # 29

# ==========================================
# 2. MODEL ARCHITECTURE
# ==========================================
class MedicalMoE(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model("efficientnet_b0", pretrained=False, num_classes=0)
        self.target_layer = self.backbone.conv_head 
        dim = self.backbone.num_features
        
        self.router = nn.Sequential(nn.Linear(dim, 256), nn.ReLU(), nn.Linear(256, len(Config.domains)))
        self.heads = nn.ModuleDict({
            dom: nn.Sequential(
                nn.Linear(dim, 512), nn.LayerNorm(512), nn.ReLU(),
                nn.Linear(512, len(Config.DOMAIN_LABELS[dom]))
            ) for dom in Config.domains
        })
        self.lora_A = nn.ParameterDict({d: nn.Parameter(torch.randn(dim, 8)*0.01) for d in Config.domains})
        self.lora_B = nn.ParameterDict({d: nn.Parameter(torch.zeros(8, dim)) for d in Config.domains})

    def forward(self, x, force_dom=None):
        feats = self.backbone(x)
        dom_logits = self.router(feats)
        pred_dom = torch.argmax(dom_logits, dim=1) if force_dom is None else force_dom
        
        final_logits = torch.full((x.size(0), Config.total_classes), -10000.0, dtype=feats.dtype, device=x.device)
        for idx, dom_name in enumerate(Config.domains):
            mask = (pred_dom == idx)
            if mask.any():
                adapted = feats[mask] + (feats[mask] @ self.lora_A[dom_name] @ self.lora_B[dom_name]) * 2.0
                h_out = self.heads[dom_name](adapted)
                start = Config.offsets[dom_name]
                final_logits[mask, start : start + h_out.size(1)] = h_out
        return final_logits, dom_logits

# ==========================================
# 3. HiResCAM EXPLAINER
# ==========================================
class HiResCAM:
    def __init__(self, model):
        self.model = model
        self.act, self.grad = None, None
        self.hooks = [
            model.target_layer.register_forward_hook(self._f),
            model.target_layer.register_full_backward_hook(self._b)
        ]
    def _f(self, m, i, o): self.act = o
    def _b(self, m, gi, go): self.grad = go[0]
    
    def generate(self, x, label, d_idx):
        self.model.eval()
        x = x.requires_grad_(True)
        logits, _ = self.model(x, force_dom=torch.tensor([d_idx]).to(x.device))
        self.model.zero_grad()
        logits[0, label].backward()
        
        # HiResCAM math: Element-wise product of activations and gradients
        cam = (self.act * self.grad).sum(dim=1).squeeze().clamp(min=0).detach().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam

    def release(self):
        for h in self.hooks: h.remove()

# ==========================================
# 4. PREDICTOR CLASS
# ==========================================
class MedicalPredictor:
    def __init__(self, model_path):
        self.model = MedicalMoE()
        state_dict = torch.load(model_path, map_location=Config.device)
        self.model.load_state_dict(state_dict)
        self.model.to(Config.device).eval()

    def process_file(self, path):
        path = Path(path)
        if path.suffix.lower() in ['.wav', '.mp3']:
            y, _ = librosa.load(path, sr=16000, duration=3.0)
            if len(y) < 48000: y = np.pad(y, (0, 48000 - len(y)))
            spec = librosa.feature.melspectrogram(y=y, sr=16000, n_mels=128)
            img = cv2.resize(librosa.power_to_db(spec, ref=np.max), (Config.img_size, Config.img_size))
            img_norm = (img - img.min()) / (img.max() - img.min() + 1e-8)
            tensor = torch.tensor(np.stack([img_norm]*3, axis=0)).float().unsqueeze(0)
            return tensor.to(Config.device), img_norm, "Audio"
        else:
            img = cv2.imread(str(path))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img, (Config.img_size, Config.img_size))
            tensor = torch.tensor(img_resized.transpose(2, 0, 1) / 255.0).float().unsqueeze(0)
            return tensor.to(Config.device), img_resized, "Image"

    def predict(self, file_path):
        input_tensor, base_display, mode = self.process_file(file_path)
        
        # Explainability setup
        cam_tool = HiResCAM(self.model)
        
        # Run Inference
        with autocast('cuda'):
            logits, dom_logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1)
            conf, pred_idx = torch.max(probs, dim=1)
            pred_dom_idx = torch.argmax(dom_logits, dim=1).item()

        # Generate Explainability Map
        mask = cam_tool.generate(input_tensor, pred_idx.item(), pred_dom_idx)
        cam_tool.release()

        return {
            "diagnosis": Config.class_names[pred_idx.item()],
            "confidence": conf.item(),
            "domain": Config.domains[pred_dom_idx],
            "heatmap": mask,
            "visual_base": base_display,
            "mode": mode
        }

# ==========================================
# 5. EXECUTION EXAMPLE
# ==========================================
# End of inference module
