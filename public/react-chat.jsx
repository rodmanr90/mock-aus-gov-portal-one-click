const { useState } = React;

const CollaboratorChat = () => {
  const [messages, setMessages] = useState([
    { user: 'pm.albany', text: 'Welcome to the secure collaboration hub.' },
    { user: 'sec.dfence', text: 'Thank you PM. I am reviewing the <strong>National Cyber Security Posture</strong> now.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      const currentUser = document.getElementById('user-display').textContent || 'unknown';
      setMessages([...messages, { user: currentUser, text: input }]);
      setInput('');
    }
  };

  return (
    <div className="panel" style={{ backgroundColor: '#002b45', border: '1px solid #1c3e5a', padding: '15px' }}>
      <h3 style={{ borderBottom: '1px solid #1c3e5a', paddingBottom: '10px' }}>Secure Internal Chat</h3>
      <div className="chat-messages" style={{ height: '200px', overflowY: 'auto', marginBottom: '15px', padding: '10px', backgroundColor: '#001a2c' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '10px' }}>
            <strong>{msg.user}: </strong>
            {/* VULNERABLE: Using dangerouslySetInnerHTML allows XSS - Wiz will flag this! */}
            <span dangerouslySetInnerHTML={{ __html: msg.text }}></span>
          </div>
        ))}
      </div>
      <div className="chat-input" style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message... (HTML allowed for emphasis)"
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
      <p className="muted" style={{ fontSize: '0.8em', marginTop: '10px' }}>
        <em>Tip: You can use HTML like <b>bold</b> or <i>italic</i> for emphasis.</em>
      </p>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('react-chat-root'));
root.render(<CollaboratorChat />);
