document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const viewInbox = document.getElementById('view-inbox');
    const viewChat = document.getElementById('view-chat');
    
    const headerIdle = document.getElementById('header-left-idle');
    const headerChat = document.getElementById('header-left-chat');
    
    const headerActionsIdle = document.getElementById('header-actions-idle');
    const headerActionsChat = document.getElementById('header-actions-chat');
    
    const footerTabs = document.getElementById('footer-tabs');
    const footerInput = document.getElementById('footer-input');
    
    const btnBack = document.getElementById('btn-back');
    const chatItems = document.querySelectorAll('.chat-item');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Navigation Logic
    function openChat(chatId) {
        // Hide Inbox view elements
        viewInbox.classList.add('hidden');
        headerIdle.classList.add('hidden');
        headerActionsIdle.classList.add('hidden');
        footerTabs.classList.add('hidden');

        // Show Chat view elements
        viewChat.classList.remove('hidden');
        headerChat.classList.remove('hidden');
        headerActionsChat.classList.remove('hidden');
        footerInput.classList.remove('hidden');
        
        // Scroll to bottom of chat
        viewChat.scrollTop = viewChat.scrollHeight;
    }

    function openInbox() {
        // Hide Chat view elements
        viewChat.classList.add('hidden');
        headerChat.classList.add('hidden');
        headerActionsChat.classList.add('hidden');
        footerInput.classList.add('hidden');

        // Show Inbox view elements
        viewInbox.classList.remove('hidden');
        headerIdle.classList.remove('hidden');
        headerActionsIdle.classList.remove('hidden');
        footerTabs.classList.remove('hidden');
    }

    // Attach listeners to chat items
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.getAttribute('data-chat-id');
            // Mock: Set header name based on clicked item
            const name = item.querySelector('.chat-name').textContent;
            const initials = item.querySelector('.avatar-circle').textContent;
            
            const headerAvatar = document.querySelector('.ac-avatar');
            headerAvatar.textContent = initials;
            document.querySelector('#header-left-chat .header-title').textContent = name;

            openChat(chatId);
        });
    });

    if (btnBack) {
        btnBack.addEventListener('click', openInbox);
    }

    // Tab switching logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked
            btn.classList.add('active');
        });
    });

    // Send Message logic
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input-field');
    const chatMessagesContainer = document.getElementById('chat-messages-container');

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const html = `
            <div class="message outgoing">
                <div class="bubble">
                    ${text}
                    <div class="msg-time">${timeString}</div>
                </div>
            </div>
        `;

        chatMessagesContainer.insertAdjacentHTML('beforeend', html);
        chatInput.value = '';
        viewChat.scrollTop = viewChat.scrollHeight;
    }
});
