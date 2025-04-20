// Инициализация Supabase
const supabaseUrl = 'https://mzusufzbtfsjlplojqnl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dXN1ZnpidGZzamxwbG9qcW5sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE1MTUyNywiZXhwIjoyMDYwNzI3NTI3fQ.ROY7eMFxSGRWXzs_-FtKdOwLKj1M0zCwXvo0EkhSRw4';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM элементы
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const galleryGrid = document.getElementById('galleryGrid');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const closeAuth = document.querySelector('.close-auth');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const authError = document.getElementById('authError');

// Обработчики событий
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
loginBtn.addEventListener('click', showAuthModal);
logoutBtn.addEventListener('click', handleLogout);
closeAuth.addEventListener('click', hideAuthModal);
signInBtn.addEventListener('click', handleSignIn);
signUpBtn.addEventListener('click', handleSignUp);

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--primary-color)';
  uploadArea.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = 'var(--gray-color)';
  uploadArea.style.backgroundColor = 'white';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--gray-color)';
  uploadArea.style.backgroundColor = 'white';
  if (e.dataTransfer.files.length) handleFileSelect({ target: { files: e.dataTransfer.files } });
});

// Функции
function showAuthModal() {
  authModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideAuthModal() {
  authModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  authError.textContent = '';
}

async function handleFileSelect(event) {
  const files = event.target.files;
  if (!files.length) return;

  const user = supabase.auth.user();
  if (!user) {
    showAuthModal();
    return;
  }

  uploadArea.style.display = 'none';
  uploadProgress.style.display = 'block';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;

    try {
      // Обновляем прогресс
      const progress = Math.floor((i / files.length) * 100);
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Загрузка ${i + 1} из ${files.length}...`;

      // Загружаем файл
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Получаем публичную ссылку
      const { publicURL } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // Сохраняем метаданные
      const { error: dbError } = await supabase
        .from('images')
        .insert([{ 
          url: publicURL, 
          user_id: user.id, 
          title: file.name.split('.')[0] || 'Без названия'
        }]);

      if (dbError) throw dbError;

    } catch (error) {
      console.error('Ошибка загрузки:', error);
      authError.textContent = `Ошибка при загрузке ${file.name}: ${error.message}`;
    }
  }

  // Завершаем загрузку
  progressFill.style.width = '100%';
  progressText.textContent = 'Загрузка завершена!';
  
  setTimeout(() => {
    uploadProgress.style.display = 'none';
    uploadArea.style.display = 'block';
    progressFill.style.width = '0%';
    fileInput.value = '';
    loadGallery();
  }, 1000);
}

async function loadGallery() {
  const { data: images, error } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки галереи:', error);
    return;
  }

  galleryGrid.innerHTML = images.map(image => `
    <div class="gallery-item">
      <img src="${image.url}" alt="${image.title}" class="gallery-image">
      <div class="image-overlay">
        <h4 class="image-title">${image.title}</h4>
      </div>
    </div>
  `).join('');
}

async function handleSignIn() {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    authError.textContent = 'Заполните все поля';
    return;
  }

  const { user, error } = await supabase.auth.signIn({
    email,
    password
  });

  if (error) {
    authError.textContent = error.message;
    return;
  }

  hideAuthModal();
  loginBtn.style.display = 'none';
  logoutBtn.style.display = 'block';
  loadGallery();
}

async function handleSignUp() {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    authError.textContent = 'Заполните все поля';
    return;
  }

  if (password.length < 6) {
    authError.textContent = 'Пароль должен быть не менее 6 символов';
    return;
  }

  const { user, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    authError.textContent = error.message;
    return;
  }

  authError.textContent = '';
  alert('Подтвердите ваш email! Мы отправили письмо с инструкциями.');
  hideAuthModal();
}

async function handleLogout() {
  await supabase.auth.signOut();
  loginBtn.style.display = 'block';
  logoutBtn.style.display = 'none';
  galleryGrid.innerHTML = '<p class="empty-gallery">Войдите, чтобы увидеть фото</p>';
}

// Проверка состояния авторизации
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    loadGallery();
  } else {
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
  }
});

// Скрываем лоадер
setTimeout(() => {
  document.querySelector('.loader').style.opacity = '0';
  setTimeout(() => {
    document.querySelector('.loader').style.display = 'none';
    // Проверяем авторизацию при загрузке
    const user = supabase.auth.user();
    if (user) {
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
      loadGallery();
    }
  }, 300);
}, 1000);
