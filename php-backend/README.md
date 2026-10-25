# battleffx11 - PHP & MySQL Backend Guide

यह फोल्डर `battleffx11` Free Fire Tournament Platform के लिए पूरी तरह से तैयार PHP और MySQL बैकएंड कोड प्रदान करता है।

## 📱 KSWEB (Android) पर सेटअप करने की विधि (Hindi Instructions)

1. **KSWEB ऐप डाउनलोड करें:**
   Google Play Store से **KSWEB: server with PHP & MySQL** ऐप अपने एंड्रॉइड मोबाइल में इंस्टॉल करें।

2. **फाइलें htdocs में रखें:**
   इस फोल्डर की सभी फाइलों को अपने फोन के `htdocs` डायरेक्टरी (उदा. `/sdcard/ksweb/htdocs/battleffx11`) में कॉपी करें।

3. **MySQL डेटाबेस सेटअप करें:**
   - KSWEB ऐप खोलें और phpMyAdmin ओपन करें (डिफ़ॉल्ट लॉगिन: `root` / पासवर्ड खाली छोड़ें)।
   - `battleff_db` नाम से नया डेटाबेस बनाएं।
   - `schema.sql` फाइल को phpMyAdmin में इम्पोर्ट (Import) करें।

4. **डेटाबेस कनेक्शन:**
   `db.php` फाइल में अपने डेटाबेस क्रेडेंशियल्स की जांच करें।

---

## 💻 XAMPP / WAMP (PC/Laptop) पर सेटअप

1. प्रोजेक्ट फोल्डर को `xampp/htdocs/battleffx11` में रखें।
2. Apache और MySQL सर्विसेज स्टार्ट करें।
3. `http://localhost/phpmyadmin` पर जाकर `schema.sql` इम्पोर्ट करें।
