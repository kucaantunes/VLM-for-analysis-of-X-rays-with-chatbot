document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const uploadedImage = document.getElementById('uploaded-image');
    const predictionText = document.getElementById('prediction-text');
    const confidenceScores = {
        pneumonia: document.getElementById('pneumonia-confidence'),
        covid: document.getElementById('covid-confidence'),
        normal: document.getElementById('normal-confidence')
    };
    const medicalReportsContainer = document.getElementById('medical-reports');
    const chatbotForm = document.getElementById('chatbot-form');
    const chatMessages = document.getElementById('chat-messages');
    const chatbotInput = document.getElementById('chatbot-input');

    // X-Ray Upload and Analysis
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('xray-upload');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please upload an X-ray image');
            return;
        }

        // Show uploaded image
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.src = event.target.result;
            uploadedImage.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Send X-ray for analysis
            const response = await axios.post('/analyze-xray', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { prediction, confidence, probabilities, medical_report } = response.data;

            // Update prediction text
            predictionText.innerHTML = `
                <strong>Prediction:</strong> ${prediction} 
                <span class="text-sm">(${(confidence * 100).toFixed(2)}% confidence)</span>
            `;

            // Update confidence scores
            Object.entries(confidenceScores).forEach(([key, element]) => {
                const scorePercent = (probabilities[key.charAt(0).toUpperCase() + key.slice(1)] * 100).toFixed(2);
                element.textContent = `${scorePercent}%`;
            });

            // Display medical report
            medicalReportsContainer.innerHTML = `
                <div class="p-4 darker-bg rounded">
                    <h4 class="font-bold mb-2">AI Medical Report</h4>
                    <p>${medical_report}</p>
                </div>
            `;
        } catch (error) {
            console.error('Error analyzing X-ray:', error);
            alert('Failed to analyze X-ray. Please try again.');
        }
    });

    // Chatbot Functionality
    chatbotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatbotInput.value.trim();

        if (!userMessage) return;

        // Add user message to chat
        appendMessage('user', userMessage);
        chatbotInput.value = '';

        try {
            // Send message to medical chat endpoint
            const response = await axios.post('/medical-chat', { message: userMessage });

            // Add AI response to chat
            appendMessage('ai', response.data.response);
        } catch (error) {
            console.error('Error in medical chat:', error);
            appendMessage('ai', 'Sorry, I encountered an error processing your request.');
        }
    });

    // Helper function to append messages to chat
    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add(
            'p-2', 'rounded', 
            sender === 'user' ? 'bg-blue-600 text-white self-end' : 'bg-gray-700 text-gray-100 self-start'
        );
        messageElement.textContent = message;

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});