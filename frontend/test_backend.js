import handler from './api/chat.js';
import dotenv from 'dotenv';
dotenv.config();

const req = {
  method: 'POST',
  body: {
    messages: [{ role: 'bot', text: 'Halo!' }] // This gets stripped, leaving an empty array
  }
};

const res = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('Status:', this.statusCode);
    console.log('Response JSON:', data);
  }
};

(async () => {
  await handler(req, res);
})();
