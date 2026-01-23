# ENchat - Messenger Web App 

MobileUX ist eine moderne Messenger-Webanwendung, entwickelt mit Angular.  
Die App ermöglicht private und Gruppen-Chats, Einladungen, Profilverwaltung sowie das Versenden von Nachrichten, Bildern und Standortdaten.  
Zusätzlich ist die Anwendung als **Progressive Web App (PWA)** konfiguriert und kann installiert sowie offline genutzt werden.

---

## Features

- Login & Registrierung
- Chatfeed mit Einzel- und Gruppenchats
- Chats:
  - Textnachrichten
  - Bilder / Dateien
  - Standort senden (Google Maps Link)
- Chat verlassen / Chat löschen (nur Owner)
- Einladungen annehmen / ablehnen
- Profil:
  - Logout
  - Account löschen
- Progressive Web App (PWA)
  - Offline-Funktionalität
  - Installierbar (Desktop & Mobile)

---

## Tech Stack

- Angular (Standalone Components)
- TypeScript
- HTML / CSS
- Angular Service Worker (`@angular/pwa`)

---

## Voraussetzungen

Folgende Software muss installiert sein:

- **Node.js** (empfohlen: LTS Version, z. B. 18.x oder 20.x)
- **npm**
- **Angular CLI** `20.3.6`

Versionen prüfen:
```bash
node -v
npm -v
ng version
```
---

## Projekt lokal ausführen
### 1. Repository klonen

```bash
git clone https://github.com/VivianSchmiss/MobileUX.git
cd MobileUX
```
### 2. Abhängigkeiten installieren

```bash
npm install
```
---

## Backend / API 
Dieses Frontend benötigt ein laufendes Backend.
- API Prefix : ```/nitzsche-api```
- Proxy-Konfiguration: ```proxy.conf.json```
- API wird über einen Angular Proxy aungesprochen

---

## Development starten
Startet die App ohne PWA-Service-Worker
```bash
ng serve --proxy-config proxy.conf.json
```
Danach im Broswer öffnen
```
http://localhost:4200
````
---

## PWA / Production Build
Dieses Projekt wurde mit folgendem Befehl als PWA eingerichtete:
```bash
ng add @angular/pwa
npm run build
```
---

## Wichtige NPm Scripts

```bash
ng serve     # Development Server
ng build     # Production Build
```

## Team
- Vivian Schmiss
- Imran Nur Reyhan Sevinc
