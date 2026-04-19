import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔥 Firebase конфигурация (ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ)
const firebaseConfig = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ВАШ_PROJECT.firebaseapp.com",
    projectId: "ВАШ_PROJECT_ID",
    storageBucket: "ВАШ_BUCKET",
    messagingSenderId: "ВАШ_SENDER_ID",
    appId: "ВАШ_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ------ 3D сцена (Three.js) ------
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

const container = document.getElementById('3d-container');
const scene = new THREE.Scene();
scene.background = null; // прозрачный
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 8);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Свет
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffaa66, 1);
dirLight.position.set(2, 5, 3);
scene.add(dirLight);

// Модель: молния/ключ – используем тор с искривлением
const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
const material = new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0x442200, metalness: 0.8, roughness: 0.2 });
const knot = new THREE.Mesh(geometry, material);
scene.add(knot);

// Добавим парящие частицы
const particleCount = 600;
const particlesGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    positions[i*3] = (Math.random() - 0.5) * 20;
    positions[i*3+1] = (Math.random() - 0.5) * 12;
    positions[i*3+2] = (Math.random() - 0.5) * 15 - 5;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particlesMat = new THREE.PointsMaterial({ color: 0xffaa66, size: 0.05 });
const particles = new THREE.Points(particlesGeometry, particlesMat);
scene.add(particles);

function animate() {
    requestAnimationFrame(animate);
    knot.rotation.x += 0.008;
    knot.rotation.y += 0.012;
    particles.rotation.y += 0.002;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------ Логика приложения ------
let currentUser = null; // 'guest' или 'admin'
let adminMode = false;
const adminPassword = "111";

// DOM элементы
const guestBtn = document.getElementById('guest-login');
const adminBtn = document.getElementById('admin-login');
const adminModal = document.getElementById('admin-modal');
const closeModal = document.querySelector('#admin-modal .close');
const submitAdmin = document.getElementById('submit-admin');
const adminPasswordInput = document.getElementById('admin-password');
const editPanel = document.getElementById('edit-panel');
const saveSettingsBtn = document.getElementById('save-settings');
const closeEditPanel = document.getElementById('close-edit-panel');
const forumInput = document.getElementById('forum-input');
const sendMsgBtn = document.getElementById('send-message');
const forumDiv = document.getElementById('forum-messages');

// Элементы для отображения контактов (редактируемые)
const welcomeTitle = document.getElementById('welcome-title');
const contactPhoneSpan = document.getElementById('contact-phone');
const contactEmailSpan = document.getElementById('contact-email');
const contactNameSpan = document.getElementById('contact-name');
const contactRegionSpan = document.getElementById('contact-region');

// Поля редактирования
const editWelcome = document.getElementById('edit-welcome');
const editPhone = document.getElementById('edit-phone');
const editEmail = document.getElementById('edit-email');
const editName = document.getElementById('edit-name');
const editRegion = document.getElementById('edit-region');

// Загрузка настроек из Firestore
async function loadSettings() {
    const docRef = doc(db, "settings", "appSettings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        welcomeTitle.innerText = data.welcome || "⚡ Электрик Ахмед ⚡";
        contactPhoneSpan.innerText = data.phone || "+7(963) 797-13-86";
        contactEmailSpan.innerText = data.email || "munkivugev@gmail.com";
        contactNameSpan.innerText = data.name || "Ахмед";
        contactRegionSpan.innerText = data.region || "Республика Дагестан: Буйнакск, Махачкала, Каспийск";
        // заполняем поля редактирования
        editWelcome.value = data.welcome || "⚡ Электрик Ахмед ⚡";
        editPhone.value = data.phone || "+7(963) 797-13-86";
        editEmail.value = data.email || "munkivugev@gmail.com";
        editName.value = data.name || "Ахмед";
        editRegion.value = data.region || "Республика Дагестан: Буйнакск, Махачкала, Каспийск";
    } else {
        // создаём по умолчанию
        await setDoc(docRef, {
            welcome: "⚡ Электрик Ахмед ⚡",
            phone: "+7(963) 797-13-86",
            email: "munkivugev@gmail.com",
            name: "Ахмед",
            region: "Республика Дагестан: Буйнакск, Махачкала, Каспийск"
        });
        loadSettings();
    }
}

// Сохранение настроек админом
async function saveSettings() {
    if (!adminMode) return alert("Доступ только у администратора");
    const docRef = doc(db, "settings", "appSettings");
    await setDoc(docRef, {
        welcome: editWelcome.value,
        phone: editPhone.value,
        email: editEmail.value,
        name: editName.value,
        region: editRegion.value
    });
    loadSettings();
    alert("Настройки сохранены!");
}

// Форум: реальное время
function loadForum() {
    const q = collection(db, "forum");
    onSnapshot(q, (snapshot) => {
        forumDiv.innerHTML = "";
        snapshot.docs.sort((a,b) => a.data().timestamp - b.data().timestamp).forEach(docSnap => {
            const data = docSnap.data();
            const msgDiv = document.createElement("div");
            msgDiv.className = "message";
            msgDiv.innerHTML = `
                <div><small>${data.author}</small> ${escapeHtml(data.text)}</div>
                ${adminMode ? `<span class="delete-btn" data-id="${docSnap.id}">🗑️</span>` : ''}
            `;
            forumDiv.appendChild(msgDiv);
        });
        // вешаем удаление только для админа
        if (adminMode) {
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = btn.getAttribute('data-id');
                    deleteDoc(doc(db, "forum", id));
                });
            });
        }
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Отправка сообщения (гость или админ)
async function sendMessage() {
    const text = forumInput.value.trim();
    if (!text) return;
    const author = adminMode ? "Админ" : (currentUser === 'guest' ? "Гость" : "Аноним");
    await addDoc(collection(db, "forum"), {
        text: text,
        author: author,
        timestamp: Date.now()
    });
    forumInput.value = "";
}

// Гостевой вход (анонимная аутентификация Firebase)
guestBtn.onclick = async () => {
    try {
        await signInAnonymously(auth);
        currentUser = 'guest';
        adminMode = false;
        editPanel.classList.add('hidden');
        alert("Вы вошли как гость. Можете писать в форум.");
        loadForum();
    } catch(e) {
        console.error(e);
        alert("Ошибка гостевого входа, проверьте Firebase");
    }
};

// Админ вход через модалку
adminBtn.onclick = () => {
    adminModal.style.display = 'flex';
};
closeModal.onclick = () => adminModal.style.display = 'none';
submitAdmin.onclick = () => {
    const pass = adminPasswordInput.value;
    if (pass === adminPassword) {
        adminMode = true;
        currentUser = 'admin';
        adminModal.style.display = 'none';
        editPanel.classList.remove('hidden');
        alert("Добро пожаловать, Админ! Доступна панель редактирования и удаление сообщений.");
        loadForum(); // перезагрузим форум с кнопками удаления
        // Также перезагружаем настройки
        loadSettings();
    } else {
        alert("Неверный пароль!");
    }
    adminPasswordInput.value = "";
};

closeEditPanel.onclick = () => editPanel.classList.add('hidden');
saveSettingsBtn.onclick = saveSettings;
sendMsgBtn.onclick = sendMessage;

// Инициализация
loadSettings();
// Автоматический гостевой вход для отображения форума (если не залогинен)
onAuthStateChanged(auth, (user) => {
    if (!user && !adminMode) {
        signInAnonymously(auth).then(() => {
            currentUser = 'guest';
            loadForum();
        });
    } else if (user && !adminMode) {
        currentUser = 'guest';
        loadForum();
    }
});

// На случай, если пользователь уже админ – форум грузится с кнопками
setInterval(() => {
    if (adminMode) loadForum(); // синхронизация удаления
}, 3000);