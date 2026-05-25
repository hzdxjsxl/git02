const express = require('express');
const cors = require('cors');
const formSchema = require('./formSchema');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/form-schema', (req, res) => {
  res.json({
    success: true,
    data: formSchema
  });
});

app.post('/api/submit-form', (req, res) => {
  const formData = req.body;
  console.log('收到表单提交数据:', JSON.stringify(formData, null, 2));
  
  res.json({
    success: true,
    message: '表单提交成功',
    submittedAt: new Date().toISOString(),
    data: formData
  });
});

app.listen(PORT, () => {
  console.log(`🚀 医院智能表单后端服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📋 获取表单: GET http://localhost:${PORT}/api/form-schema`);
  console.log(`📝 提交表单: POST http://localhost:${PORT}/api/submit-form`);
});
