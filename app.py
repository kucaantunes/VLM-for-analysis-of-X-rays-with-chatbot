import torch
import torchvision.transforms as transforms
from PIL import Image
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import clip
import numpy as np

app = Flask(__name__)
CORS(app)

# Custom CLIP Model for Medical Image Classification
class MedicalCLIPClassifier(torch.nn.Module):
    def __init__(self, clip_model):
        super().__init__()
        self.clip_model = clip_model
        
        # Freeze CLIP model parameters
        for param in self.clip_model.parameters():
            param.requires_grad = False
        
        # Custom classification head
        self.classifier = torch.nn.Sequential(
            torch.nn.Linear(512, 512),  # Use fixed input size based on CLIP model
            torch.nn.ReLU(),
            torch.nn.Dropout(0.5),
            torch.nn.Linear(512, 3)  # 3 classes: normal, pneumonia, covid
        )
    
    def forward(self, image, text_features):
        image_features = self.clip_model.encode_image(image)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        combined_features = image_features * text_features
        return self.classifier(combined_features)

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
clip_model, preprocess = clip.load("ViT-B/32", device=device)

# Define text prompts for classification
text_prompts = ["a normal chest X-ray", "an X-ray showing signs of pneumonia", "an X-ray indicating COVID-19"]
text_tokens = clip.tokenize(text_prompts).to(device)

# Encode text prompts
with torch.no_grad():
    text_features = clip_model.encode_text(text_tokens)
    text_features /= text_features.norm(dim=-1, keepdim=True)

# Initialize medical CLIP classifier
medical_classifier = MedicalCLIPClassifier(clip_model).to(device)

# Medical Report Generation (Placeholder - would integrate VLM/LLM in production)
def generate_medical_report(prediction_class):
    # Simulated report generation
    reports = {
        0: "Detailed normal chest X-ray analysis...",
        1: "Comprehensive pneumonia evaluation...",
        2: "Extensive COVID-19 diagnostic insights..."
    }
    return reports.get(prediction_class, "Unclassified medical report")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_xray():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    image = Image.open(file.stream)
    
    # Preprocess image
    input_tensor = preprocess(image).unsqueeze(0).to(device)
    
    # Prediction
    with torch.no_grad():
        logits = medical_classifier(input_tensor, text_features)
        probabilities = torch.softmax(logits, dim=-1)
        prediction = torch.argmax(probabilities).item()
    
    # Generate medical report
    medical_report = generate_medical_report(prediction)
    
    return jsonify({
        "prediction": ["Normal", "Pneumonia", "COVID-19"][prediction],
        "probabilities": probabilities.cpu().numpy().tolist(),
        "medical_report": medical_report
    })

if __name__ == '__main__':
    app.run(debug=True)