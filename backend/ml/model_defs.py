"""
Model definitions for VaidyaVision diagnostic system.
Architectures must exactly match training (iiit-pune.ipynb) 
so saved state_dicts can be loaded.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from torchvision import models


class BrainExpert(nn.Module):
    """EfficientNet-B2 backbone for brain tumor classification (4 classes)."""
    def __init__(self, num_classes: int = 4):
        super().__init__()
        self.backbone = timm.create_model('efficientnet_b2', pretrained=False, num_classes=0, global_pool='avg')
        self.fc = nn.Sequential(
            nn.Linear(1408, 512),
            nn.BatchNorm1d(512),
            nn.Hardswish(),
            nn.Dropout(p=0.4),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.fc(features)


class LungExpert(nn.Module):
    """DenseNet121 backbone for lung disease classification (5 classes)."""
    def __init__(self, num_classes: int = 5):
        super().__init__()
        self.backbone = models.densenet121(weights=None)
        num_ftrs = self.backbone.classifier.in_features
        self.backbone.classifier = nn.Identity()
        self.head = nn.Sequential(
            nn.Linear(num_ftrs, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)


class SkinExpert(nn.Module):
    """ResNet50 backbone for skin disease classification (9 classes)."""
    def __init__(self, num_classes: int = 9):
        super().__init__()
        self.backbone = models.resnet50(weights=None)
        num_ftrs = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.head = nn.Sequential(
            nn.Linear(num_ftrs, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.45),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)


class ECGExpert(nn.Module):
    """EfficientNet-B0 backbone for ECG analysis (4 classes)."""
    def __init__(self, num_classes: int = 4):
        super().__init__()
        self.backbone = timm.create_model('efficientnet_b0', pretrained=False, num_classes=0)
        self.head = nn.Sequential(
            nn.Linear(1280, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)


class ModalityRouter(nn.Module):
    """ResNet34 router to classify image modality (brain/lung/skin/ecg)."""
    def __init__(self):
        super().__init__()
        self.model = models.resnet34(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, 4)

    def forward(self, x):
        return self.model(x)


class ClinicalAIDiagnosticSystem(nn.Module):
    """Unified system: ModalityRouter + all Expert models in a single checkpoint."""
    def __init__(self, class_counts: dict):
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
        """MC Dropout inference with uncertainty estimation."""
        # 1. Router
        self.router.eval()
        with torch.no_grad():
            modality_idx = torch.argmax(self.router(x), dim=1).item()
            modality = self.labels[modality_idx]

        # 2. Expert with MC Dropout
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
            return {
                "status": "REJECTED",
                "reason": "High Uncertainty",
                "score": uncertainty,
                "modality": modality,
            }

        return {
            "status": "ACCEPTED",
            "modality": modality,
            "diagnosis": class_idx.item(),
            "confidence": conf.item(),
            "uncertainty": uncertainty,
            "mean_prediction": mean_prediction,
        }
