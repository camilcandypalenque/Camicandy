# 🚀 Guía de Despliegue - Cami Candy POS

## Opción 1: Netlify (Recomendado - Más Fácil)

### Pasos:

1. **Ve a** [https://app.netlify.com](https://app.netlify.com)

2. **Crea una cuenta** (puedes usar tu cuenta de GitHub o email)

3. **Arrastra tu carpeta**:
   - En el dashboard de Netlify, verás un área que dice "Drag and drop your site folder here"
   - Abre el Explorador de Windows y navega a: `C:\Users\curso\Desktop\PLATAFORMACAMILCANDY`
   - Arrastra TODA la carpeta al navegador

4. **¡Listo!** Netlify te dará una URL como: `https://amazing-name-123456.netlify.app`

5. **Personaliza tu URL** (opcional):
   - Ve a Site settings > Domain management > Options > Edit site name
   - Cámbialo a algo como: `cami-candy-pos` → `https://cami-candy-pos.netlify.app`

---

## Opción 2: GitHub Pages

### Requisitos:
- Cuenta de GitHub
- Git instalado

### Pasos:

1. **Crea un repositorio en GitHub**:
   - Ve a [https://github.com/new](https://github.com/new)
   - Nombre: `cami-candy-pos`
   - Ponlo como **Público**
   - Crea el repositorio

2. **Sube tu código**:
   ```bash
   cd C:\Users\curso\Desktop\PLATAFORMACAMILCANDY
   git init
   git add .
   git commit -m "Cami Candy POS v2.0"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/cami-candy-pos.git
   git push -u origin main
   ```

3. **Activa GitHub Pages**:
   - Ve a Settings > Pages
   - Source: Deploy from a branch
   - Branch: main, / (root)
   - Save

4. **Tu URL**: `https://TU-USUARIO.github.io/cami-candy-pos`

---

## Opción 3: Firebase Hosting

### Requisitos:
- Node.js instalado
- Cuenta de Firebase (ya la tienes)

### Pasos:

1. **Instala Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Inicia sesión**:
   ```bash
   firebase login
   ```

3. **Inicializa el proyecto**:
   ```bash
   cd C:\Users\curso\Desktop\PLATAFORMACAMILCANDY
   firebase init hosting
   ```
   - Selecciona tu proyecto existente
   - Public directory: `.` (punto, significa carpeta actual)
   - Configure as single-page app: No
   - Overwrite index.html: No

4. **Despliega**:
   ```bash
   firebase deploy
   ```

5. **Tu URL**: `https://TU-PROYECTO.web.app`

---

## 📱 URLs de Acceso

Una vez desplegado, tendrás:

| Vista | URL |
|-------|-----|
| **Admin (PC)** | `https://tu-sitio.netlify.app/` |
| **Vendedor (Móvil)** | `https://tu-sitio.netlify.app/vendedor.html` |

## ⚠️ Importante

- Tu configuración de Firebase ya está lista para producción
- Todos los datos se guardan en la nube (Firebase)
- Múltiples dispositivos pueden acceder simultáneamente
- Los datos se sincronizan en tiempo real

---

## 🔒 Seguridad (Opcional pero Recomendado)

Para proteger tu aplicación:

1. Ve a la [Consola de Firebase](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Authentication > Sign-in method
4. Habilita "Correo electrónico/contraseña"
5. Reglas de Firestore:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

Esto hará que solo usuarios autenticados puedan acceder a los datos.
