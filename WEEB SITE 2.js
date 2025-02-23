my-website/
├── backend/
│   ├── server.js
│   └── .env
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
└── package.json
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // تهيئة Stripe باستخدام المفتاح السري
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// إعدادات Express
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ متصل بقاعدة البيانات')).catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// نموذج كتاب
const Book = mongoose.model('Book', new mongoose.Schema({
  title: String,
  author: String,
  price: Number,
  fileUrl: String,
}));

// نموذج مستخدم
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
}));

// تسجيل مستخدم جديد
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.json({ message: '✅ تم إنشاء الحساب بنجاح' });
  } catch (error) {
    res.status(500).json({ message: '❌ حدث خطأ أثناء إنشاء الحساب', error: error.message });
  }
});

// تسجيل الدخول
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: '❌ المستخدم غير موجود' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: '❌ كلمة المرور غير صحيحة' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, message: '✅ تسجيل الدخول ناجح' });
  } catch (error) {
    res.status(500).json({ message: '❌ حدث خطأ أثناء تسجيل الدخول', error: error.message });
  }
});

// التحقق من المصادقة
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: '❌ مطلوب تسجيل الدخول' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: '❌ جلسة غير صالحة' });
    req.user = user;
    next();
  });
};

// مسار للحصول على جميع الكتب (يتطلب المصادقة)
app.get('/books', authenticateJWT, async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: '❌ حدث خطأ أثناء جلب الكتب', error: error.message });
  }
});

// مسار الدفع باستخدام Stripe
app.post('/checkout', async (req, res) => {
  const { amount, currency = 'usd' } = req.body;
  
  // تحقق من المبلغ
  if (amount <= 0) return res.status(400).json({ message: '❌ المبلغ غير صالح' });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // تحويل المبلغ إلى سنتات
      currency,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: '❌ فشل في معالجة الدفع', error: error.message });
  }
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(🚀 الخادم يعمل على http://localhost:${PORT});
});
MONGO_URI=mongodb://localhost:27017/your-db-name
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
const stripe = Stripe('your_publishable_key'); // استخدم المفتاح العام من حساب Stripe الخاص بك
const payButton = document.getElementById('pay-button');

// تهيئة عنصر إدخال بطاقة الدفع
const cardElement = document.createElement('div'); 
document.body.appendChild(cardElement); // قم بإضافة العنصر إلى الصفحة (هذه خطوة مؤقتة لإظهار الفكرة)

// اجعل زر الدفع يعمل
payButton.addEventListener('click', async () => {
  const res = await fetch('http://localhost:5000/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 10 }), // المبلغ بالـ دولار
  });

  const { clientSecret } = await res.json();
  const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement, // أدخل بطاقة الدفع هنا
    },
  });

  if (result.error) {
    console.error(result.error.message);
  } else {
    if (result.paymentIntent.status === 'succeeded') {
      console.log('تم الدفع بنجاح!');
    }
  }
});
npm install express cors mongoose bcrypt jwt-simple stripe dotenv