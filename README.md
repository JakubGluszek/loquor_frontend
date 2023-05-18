# Loquor

## About

Demo website might not work since I'm using a public stun server and it's frankly not reliable.
Might solve this issue some day by simply hosting my own stun server.

It's a web based peer to peer chat app built with React. Chat is built on top of the WebRTC API.
The [signaling server](https://github.com/JakubGluszek/loquor_backend) used for peer discovery is a websocket server built in Python.

## Screenshots
  
<details>
  <summary>Welcome View</summary>
  <div align="center">
    <img src="https://github.com/JakubGluszek/loquor_frontend/blob/master/images/welcome-view.png" alt="screenshot" />
  </div>
</details>
<details>
  <summary>Home View</summary>
  <div align="center">
    <img src="https://github.com/JakubGluszek/loquor_frontend/blob/master/images/home-view.png" alt="screenshot" />
  </div>
</details>
<details>
  <summary>Chat View</summary>
  <div align="center">
    <img src="https://github.com/JakubGluszek/loquor_frontend/blob/master/images/chat-view.png" alt="screenshot" />
  </div>
</details>

### Core

- [x] Chat invite link
- [ ] Refactor code
   - [ ] Transfer logic into seperate hooks & expose functionality through non-breakable interfaces
- [ ] Add a "Learn more" section in <LoginView />
- [ ] Replace chat <input /> with a <CustomInput /> component
  - [ ] Support for multi-line input
- [ ] Handle errors
  - [ ] ICE server errors

### Ideas

- [ ] New UI
- [ ] Group chat (up to 4 users)?
