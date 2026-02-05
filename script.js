// ────────────────────────────────────────────────
//  FIREBASE CONFIG
// ────────────────────────────────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyDCbW11uH6UvnJTJLOV-dNQiXQ_w1gFRN0",
  authDomain: "academic-portal-b1122.firebaseapp.com",
  projectId: "academic-portal-b1122",
  storageBucket: "academic-portal-b1122.appspot.com",
  messagingSenderId: "904116478398",
  appId: "1:904116478398:web:3dadab2b045229418d59ef"
});

const db = firebase.firestore();

let me = localStorage.getItem("cloud_user");
let targetUser = me;
let curFID = null;

let currentUserSecrets = { showPass: null, delPass: null };
let foldersUnsubscribe = null;
let filesUnsubscribe = null;

function unsubscribeCurrent() {
  [foldersUnsubscribe, filesUnsubscribe].forEach(u => u && u());
  foldersUnsubscribe = filesUnsubscribe = null;
}

// ─── UI HELPERS ─────────────────────────────────────
function switchV(v) {
  document.getElementById('v-login').classList.toggle('hidden', v !== 'login');
  document.getElementById('v-reg').classList.toggle('hidden', v !== 'reg');
  document.getElementById('v-forgot').classList.toggle('hidden', v !== 'forgot');
}

function handleKey(e, mode) {
  if (e.key === 'Enter') {
    if (mode === 'login') handleLogin();
    if (mode === 'reg') handleRegister();
  }
}

function togglePW(id, icon) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function toggleLoad(show, msg = "Loading...") {
  document.getElementById("load-txt").innerText = msg;
  document.getElementById("loader").style.display = show ? "flex" : "none";
}

// ─── AUTH ───────────────────────────────────────────
async function handleLogin() {
  const u = document.getElementById('l-u').value.trim();
  const p = document.getElementById('l-p').value.trim();

  if (!u || !p) return alert("Enter username and password");

  if (u === "admin" && p === "pass1406") {
    me = "admin";
    localStorage.setItem("cloud_is_adm", "true");
    localStorage.setItem("cloud_user", me);
    location.reload();
    return;
  }

  toggleLoad(true);

  try {
    const doc = await db.collection("users").doc(u).get();
    if (!doc.exists) return alert("User not found.");
    if (doc.data().password !== p) return alert("Wrong password.");

    me = u;
    currentUserSecrets.showPass = doc.data().showPass || null;
    currentUserSecrets.delPass = doc.data().delPass || null;
    localStorage.setItem("cloud_user", me);

    location.reload();
  } catch (err) {
    alert("Login error: " + err.message);
  } finally {
    toggleLoad(false);
  }
}

async function handleRegister() {
  const u = document.getElementById('r-u').value.trim();
  const p = document.getElementById('r-p').value.trim();
  const k = document.getElementById('r-k').value.trim();
  const s = document.getElementById('r-show').value.trim();
  const d = document.getElementById('r-del').value.trim();

  if (!u || !p || !k || !s || !d) return alert("Fill all fields");
  if (new Set([p,k,s,d]).size !== 4) return alert("All passwords must be different");

  toggleLoad(true, "Creating...");

  try {
    const ref = db.collection("users").doc(u);
    if ((await ref.get()).exists) return alert("Username taken");

    await ref.set({
      password: p,
      recovery: k,
      showPass: s,
      delPass: d,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Account created! Login now.");
    switchV('login');
  } catch (err) {
    alert("Registration failed: " + err.message);
  } finally {
    toggleLoad(false);
  }
}

async function handleReset() {
  const u = document.getElementById('f-u').value.trim();
  const k = document.getElementById('f-k').value.trim();
  const n = document.getElementById('f-n').value.trim();

  if (!u || !k || !n) return alert("Fill all fields");

  toggleLoad(true, "Resetting...");

  try {
    const doc = await db.collection("users").doc(u).get();
    if (!doc.exists || doc.data().recovery !== k) return alert("Invalid recovery key");

    await db.collection("users").doc(u).update({ password: n });
    alert("Password reset. Login now.");
    switchV('login');
  } catch (err) {
    alert("Reset failed: " + err.message);
  } finally {
    toggleLoad(false);
  }
}

// ─── APP START ──────────────────────────────────────
function start() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  targetUser = me;
  document.getElementById("top-user").innerText = `User: ${me}`;

  if (localStorage.getItem("cloud_is_adm") === "true") {
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("btn-export").classList.remove("hidden");
    loadUsers();
  } else if (me) {
    db.collection("users").doc(me).get().then(doc => {
      if (doc.exists) {
        currentUserSecrets.showPass = doc.data().showPass || null;
        currentUserSecrets.delPass = doc.data().delPass || null;
      }
    });
  }

  loadFolders();
}

// ─── ADMIN ──────────────────────────────────────────
async function loadUsers() {
  const list = document.getElementById("user-list");
  list.innerHTML = '<div style="text-align:center; color:var(--muted); padding:1rem;">Loading...</div>';

  try {
    const snap = await db.collection("users").get();
    list.innerHTML = "";

    if (snap.empty) {
      list.innerHTML = '<div style="text-align:center; color:var(--muted); padding:1rem;">No users</div>';
      return;
    }

    snap.forEach(doc => {
      const id = doc.id;
      list.innerHTML += `
        <div class="user-row">
          <span>${id}</span>
          <div>
            <button class="btn btn-primary btn-sm" onclick="viewOther('${id}')">View</button>
            <button class="btn btn-danger btn-sm" onclick="delDoc('users','${id}')">Delete</button>
          </div>
        </div>`;
    });
  } catch (err) {
    list.innerHTML = `<div style="color:var(--danger); text-align:center; padding:1rem;">Error: ${err.message}</div>`;
  }
}

function viewOther(uid) {
  targetUser = uid;
  document.getElementById("viewing-label").innerHTML = 
    `Viewing: <span style="color:var(--gold)">${uid}</span> 
     <button class="btn btn-sm btn-gold" onclick="resetV()">Back</button>`;
  unsubscribeCurrent();
  loadFolders();
}

function resetV() {
  targetUser = me;
  document.getElementById("viewing-label").innerText = "Folders";
  unsubscribeCurrent();
  loadFolders();
}

// ─── FOLDERS ────────────────────────────────────────
function loadFolders() {
  unsubscribeCurrent();
  const grid = document.getElementById("folders-grid");
  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--muted); padding:2rem 0;">Loading...</div>';

  foldersUnsubscribe = db.collection("folders")
    .where("owner", "==", targetUser)
    .onSnapshot(snap => {
      grid.innerHTML = "";
      if (snap.empty) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--muted); padding:2rem 0;">No folders</div>';
        return;
      }
      snap.forEach(doc => {
        const data = doc.data();
        grid.innerHTML += `
          <div class="card">
            <i class="fas fa-trash del-btn" onclick="event.stopPropagation(); delDoc('folders','${doc.id}')"></i>
            <div onclick="openF('${doc.id}', '${data.name.replace(/'/g, "\\'")}')">
              <i class="fas fa-folder"></i>
              <p>${data.name}</p>
            </div>
          </div>`;
      });
    });
}

function openF(id, name) {
  curFID = id;
  document.getElementById("active-folder-name").innerText = name;
  document.getElementById("folders-view").classList.add("hidden");
  document.getElementById("files-view").classList.remove("hidden");
  loadFiles();
}

// ─── FILES ──────────────────────────────────────────
function loadFiles() {
  unsubscribeCurrent();
  const grid = document.getElementById("files-grid");
  grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--muted); padding:2rem 0;">Loading...</div>';

  filesUnsubscribe = db.collection("files")
    .where("folderId", "==", curFID)
    .onSnapshot(snap => {
      grid.innerHTML = "";
      if (snap.empty) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--muted); padding:2rem 0;">No files</div>';
        return;
      }
      snap.forEach(doc => {
        const data = doc.data();
        grid.innerHTML += `
          <div class="card">
            <i class="fas fa-trash del-btn" onclick="event.stopPropagation(); delDoc('files','${doc.id}')"></i>
            <i class="fas fa-file-alt"></i>
            <p>${data.name}</p>
            <button class="btn btn-primary btn-sm" onclick="viewFileWithPass('${data.url}')">View</button>
            <button class="btn btn-gold btn-sm" onclick="downloadFileWithPass('${data.url}', '${data.name.replace(/'/g, "\\'")}')">Download</button>
          </div>`;
      });
    });
}

function viewFileWithPass(url) {
  if (!currentUserSecrets.showPass) return alert("View password not set");
  const pass = prompt("View password:");
  if (!pass || pass !== currentUserSecrets.showPass) return alert("Wrong password");
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function downloadFileWithPass(url, name) {
  if (!currentUserSecrets.showPass) return alert("View password not set");

  const pass = prompt("View password:");
  if (!pass || pass !== currentUserSecrets.showPass) return alert("Wrong password");

  try {
    toggleLoad(true, "Downloading...");
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = name || 'file';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (err) {
    alert("Download failed: " + err.message);
  } finally {
    toggleLoad(false);
  }
}

// ─── UPLOAD ─────────────────────────────────────────
async function uploadSync() {
  const files = document.getElementById("file-selector").files;
  if (!files?.length) return alert("Select files first");

  toggleLoad(true, "Uploading...");

  try {
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "vault_preset");

      const res = await fetch("https://api.cloudinary.com/v1_1/dfnoy78m8/upload", {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      await db.collection("files").add({
        folderId: curFID,
        name: file.name,
        url: data.secure_url,
        size: file.size,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    document.getElementById("file-selector").value = "";
    alert(`Uploaded ${files.length} file(s)`);
  } catch (err) {
    alert("Upload failed: " + err.message);
  } finally {
    toggleLoad(false);
  }
}

// ─── UTILITIES ──────────────────────────────────────
async function delDoc(col, id) {
  const isAdminUser = localStorage.getItem("cloud_is_adm") === "true" && col === "users";

  if (!isAdminUser) {
    if (!currentUserSecrets.delPass) return alert("Delete password not set");
    const pass = prompt("Delete password:");
    if (!pass || pass !== currentUserSecrets.delPass) return alert("Wrong password");
  }

  if (!confirm("Delete?")) return;

  try {
    await db.collection(col).doc(id).delete();
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
}

async function createFolder() {
  const name = prompt("Folder name:");
  if (!name?.trim()) return;

  try {
    await db.collection("folders").add({
      name: name.trim(),
      owner: targetUser,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    alert("Create failed: " + err.message);
  }
}

async function exportUsers() {
  toggleLoad(true, "Exporting...");
  try {
    const snap = await db.collection("users").get();
    let csv = "Username,Password,Recovery,Show,Delete\n";
    snap.forEach(doc => {
      const d = doc.data();
      csv += `"${doc.id}","${(d.password||"").replace(/"/g,'""')}","${(d.recovery||"").replace(/"/g,'""')}","${(d.showPass||"").replace(/"/g,'""')}","${(d.delPass||"").replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Export failed: " + err.message);
  } finally {
    toggleLoad(false);
  }
}

function backToFolders() {
  document.getElementById("files-view").classList.add("hidden");
  document.getElementById("folders-view").classList.remove("hidden");
  unsubscribeCurrent();
  curFID = null;
}

function logout() {
  unsubscribeCurrent();
  localStorage.clear();
  location.reload();
}

// ─── AUTO START ─────────────────────────────────────
if (me) start();