const { useState, useEffect } = React;

const CollaboratorChat = () => {
  const [messages, setMessages] = useState([
    { user: 'Internal Support AI', text: 'Welcome to the secure collaboration hub. I am your departmental AI assistant. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (input.trim()) {
      const currentUser = document.getElementById('user-display').textContent || 'unknown';
      const userMessage = { user: currentUser, text: input };
      setMessages(prev => [...prev, userMessage]);
      const messageText = input;
      setInput('');
      
      // Bot response logic
      setIsTyping(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText })
        });
        const botData = await response.json();
        
        setTimeout(() => {
          setMessages(prev => [...prev, botData]);
          setIsTyping(false);
        }, 1000);
      } catch (err) {
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="panel" style={{ backgroundColor: '#002b45', border: '1px solid #1c3e5a', padding: '15px' }}>
      <h3 style={{ borderBottom: '1px solid #1c3e5a', paddingBottom: '10px' }}>Secure Internal Chat</h3>
      <div className="chat-messages" style={{ height: '300px', overflowY: 'auto', marginBottom: '15px', padding: '10px', backgroundColor: '#001a2c' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '10px' }}>
            <strong style={{ color: msg.user === 'Internal Support AI' ? '#10a37f' : '#facc15' }}>{msg.user}: </strong>
            <span dangerouslySetInnerHTML={{ __html: msg.text }}></span>
          </div>
        ))}
        {isTyping && (
          <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#9ca3af' }}>AI is typing...</div>
        )}
      </div>
      <div className="chat-input" style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message or ask the AI a question..."
          style={{ flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #1c3e5a', backgroundColor: '#001a2c', color: 'white' }}
        />
        <button 
          onClick={handleSend}
          className="btn btn-primary"
          style={{ margin: 0 }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('react-chat-root'));
root.render(<CollaboratorChat />);
