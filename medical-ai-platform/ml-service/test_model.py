"""Quick CLI test for the ML inference pipeline."""
import sys
import os

# Add current dir to path
sys.path.insert(0, os.path.dirname(__file__))

from inference import load_models, predict, CLASS_LABELS

def test_image(image_path: str):
    print(f"\n{'='*60}")
    print(f"  VaidyaVision ML Inference Test")
    print(f"{'='*60}")
    print(f"  Image: {os.path.basename(image_path)}")
    print(f"  Size:  {os.path.getsize(image_path) / 1024:.1f} KB")
    print(f"{'='*60}\n")

    # Load models
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    load_models(models_dir)

    # Read image
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Run inference
    result = predict(image_bytes)

    print(f"\n{'─'*40}")
    print(f"  📋 RESULTS")
    print(f"{'─'*40}")
    print(f"  Status:      {result['status']}")
    print(f"  Modality:    {result['modality'].upper()}")
    
    if result['status'] == 'ACCEPTED':
        print(f"  Diagnosis:   {result['diagnosis']}")
        print(f"  Confidence:  {result['confidence']*100:.1f}%")
        print(f"  Uncertainty: {result['uncertainty']*100:.2f}%")
        print(f"  Triage:      {result['triage_score']}/100")
        
        if 'all_probabilities' in result:
            print(f"\n  📊 All Probabilities:")
            for label, prob in sorted(result['all_probabilities'].items(), key=lambda x: -x[1]):
                bar = '█' * int(prob * 30)
                print(f"     {label:30s} {prob*100:5.1f}% {bar}")
    else:
        print(f"  Reason:      {result.get('reason', 'N/A')}")
        print(f"  Uncertainty: {result['uncertainty']*100:.2f}%")
    
    print(f"\n  Heatmap:     {'Generated ✓' if result.get('heatmap_base64') else 'N/A'}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_model.py <image_path>")
        sys.exit(1)
    
    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"Error: File not found: {path}")
        sys.exit(1)
    
    test_image(path)
