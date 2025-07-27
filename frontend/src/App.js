import React, { useEffect, useState } from "react"; 
import { QRCodeCanvas } from "qrcode.react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom"; 
import DataTable from 'react-data-table-component';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.register(ChartDataLabels);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("http://localhost:5000/stats")
      .then(res => res.json())
      .then(setStats)
      .catch(() => setError("Gagal mengambil statistik"))
      .finally(() => setLoading(false));
  }, []);

  // Data untuk bar chart tren 5 hari terakhir
  const trendData = stats && Array.isArray(stats.trend) ? {
    labels: stats.trend.map(t => t.date),
    datasets: [
      {
        label: 'Pesan Masuk',
        data: stats.trend.map(t => t.received),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderRadius: 8,
      },
      {
        label: 'Pesan Keluar',
        data: stats.trend.map(t => t.sent),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderRadius: 8,
      },
    ],
  } : { labels: [], datasets: [] };
  const trendOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Tren Pesan 5 Hari Terakhir', font: { size: 18 } },
      datalabels: {
        anchor: 'end',
        align: 'top',
        font: { weight: 'bold' },
        color: '#222',
        formatter: function(value) { return value; }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      {loading ? (
        <div>Memuat statistik...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-100 p-4 rounded shadow text-center">
              <div className="text-2xl font-bold text-green-700">{stats && typeof stats.received === 'number' ? stats.received : 0}</div>
              <div className="text-sm text-green-800">Pesan Masuk</div>
            </div>
            <div className="bg-blue-100 p-4 rounded shadow text-center">
              <div className="text-2xl font-bold text-blue-700">{stats && typeof stats.sent === 'number' ? stats.sent : 0}</div>
              <div className="text-sm text-blue-800">Pesan Keluar</div>
            </div>
            <div className="bg-yellow-100 p-4 rounded shadow text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats && typeof stats.contacts === 'number' ? stats.contacts : 0}</div>
              <div className="text-sm text-yellow-800">Kontak</div>
            </div>
            <div className="bg-red-100 p-4 rounded shadow text-center">
              <div className="text-2xl font-bold text-red-700">{stats && typeof stats.autoReplies === 'number' ? stats.autoReplies : 0}</div>
              <div className="text-sm text-red-800">Auto Reply</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow mb-8">
            {trendData.labels.length > 0 ? (
              <Bar data={trendData} options={trendOptions} height={80} />
            ) : (
              <div className="text-gray-500 text-center">Tidak ada data tren</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function KirimPesan({ connected, qr, handleSend, to, setTo, text, setText, sendStatus, selectedContact, setSelectedContact, token, fetchWithToken }) {
  const [contacts, setContacts] = useState([]);
  useEffect(() => {
    if (!token) return;
    fetchWithToken("http://localhost:5000/contacts")
      .then(res => res.json())
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [token, fetchWithToken]);

  // Jika user memilih kontak dari halaman Kontak
  useEffect(() => {
    if (selectedContact) {
      setTo(selectedContact.number);
    }
  }, [selectedContact, setTo]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Kirim Pesan WhatsApp</h2>
      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
        <select
          className="border p-2 rounded w-full md:w-64"
          value={to}
          onChange={e => setTo(e.target.value)}
        >
          <option value="">Pilih Kontak...</option>
          {contacts.map(c => (
            <option key={c.id} value={c.number}>{c.name} ({c.number})</option>
          ))}
        </select>
        <span className="text-gray-500 text-xs md:ml-2">Atau isi manual di bawah</span>
      </div>
      {!connected && qr && (
        <div className="mb-8 flex flex-col items-center">
          <p className="mb-2 font-semibold">Scan QR Code WhatsApp:</p>
          <QRCodeCanvas value={qr} size={256} />
        </div>
      )}
      {connected && (
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Nomor WhatsApp (628xxxxxx)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border p-2 rounded w-full"
              required
            />
          </div>
          <div>
            <textarea
              placeholder="Isi pesan"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="border p-2 rounded w-full"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Kirim Pesan
          </button>
          {sendStatus && <div className="mt-2 text-sm">{sendStatus}</div>}
        </form>
      )}
    </div>
  );
}

function PesanTerkirim({ token, fetchWithToken }) {
  const [data, setData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetchWithToken("http://localhost:5000/sent-messages")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData([]));
  }, [token, fetchWithToken]);

  const columns = [
    { name: 'No', selector: (row, i) => i + 1, width: '60px', sortable: false },
    { name: 'Nomor Tujuan', selector: row => row.to, sortable: true },
    { name: 'Pesan', selector: row => row.message, sortable: true, wrap: true },
    { name: 'Waktu', selector: row => new Date(row.timestamp).toLocaleString(), sortable: true },
    {
      name: 'Aksi',
      cell: row => (
        <>
          <button onClick={() => handleEdit(row)} className="px-2 py-1 bg-yellow-400 rounded mr-2">Edit</button>
          <button onClick={() => handleDelete(row.id)} className="px-2 py-1 bg-red-500 text-white rounded">Hapus</button>
        </>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '160px'
    }
  ];

  const filteredData = data.filter(row =>
    row.to?.toLowerCase().includes(filterText.toLowerCase()) ||
    row.message?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditMessage(row.message);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus pesan ini?")) return;
    await fetchWithToken(`http://localhost:5000/sent-messages/${id}`, { method: "DELETE" });
    setEditId(null); setEditMessage("");
    setError("");
    // Refresh data
    fetch("http://localhost:5000/sent-messages")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData([]));
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editMessage.trim()) { setError("Pesan tidak boleh kosong"); return; }
    await fetchWithToken(`http://localhost:5000/sent-messages/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: editMessage })
    });
    setEditId(null); setEditMessage(""); setError("");
    fetch("http://localhost:5000/sent-messages")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData([]));
  };
  const handleCancel = () => { setEditId(null); setEditMessage(""); setError(""); };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pesan Terkirim</h2>
      <div className="flex justify-end">
        <input
          type="text"
          className="border p-2 rounded mb-2 w-full max-w-xs"
          placeholder="Cari nomor atau pesan..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>
      {editId && (
        <form onSubmit={handleUpdate} className="mb-2 flex items-center space-x-2">
          <input
            type="text"
            className="border p-2 rounded w-full max-w-lg"
            value={editMessage}
            onChange={e => setEditMessage(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Simpan</button>
          <button type="button" onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded">Batal</button>
          {error && <span className="text-red-500 text-sm ml-2">{error}</span>}
        </form>
      )}
      <DataTable
        columns={columns}
        data={filteredData}
        pagination
        highlightOnHover
        striped
        noDataComponent={<div className="text-center py-2">Belum ada data</div>}
      />
    </div>
  );
}

function PesanMasuk({ token, fetchWithToken }) {
  const [data, setData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetchWithToken("http://localhost:5000/received-messages")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData([]));
  }, [token, fetchWithToken]);

  const columns = [
    { name: 'No', selector: (row, i) => i + 1, width: '60px', sortable: false },
    { name: 'Nomor Pengirim', selector: row => row.from, sortable: true },
    { name: 'Pesan', selector: row => row.message, sortable: true, wrap: true },
    { name: 'Waktu', selector: row => new Date(row.timestamp).toLocaleString(), sortable: true },
    {
      name: 'Aksi',
      cell: row => (
        <>
          <button onClick={() => handleEdit(row)} className="px-2 py-1 bg-yellow-400 rounded mr-2">Edit</button>
          <button onClick={() => handleDelete(row.id)} className="px-2 py-1 bg-red-500 text-white rounded">Hapus</button>
        </>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '160px'
    }
  ];

  const filteredData = data.filter(row =>
    row.from?.toLowerCase().includes(filterText.toLowerCase()) ||
    row.message?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditMessage(row.message);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus pesan ini?")) return;
    await fetchWithToken(`http://localhost:5000/received-messages/${id}`, { method: "DELETE" });
    setEditId(null); setEditMessage("");
    setError("");
    fetch("http://localhost:5000/received-messages")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData([]));
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editMessage.trim()) { setError("Pesan tidak boleh kosong"); return; }
    await fetchWithToken(`http://localhost:5000/received-messages/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: editMessage })
    });
    setEditId(null); setEditMessage(""); setError("");
    fetch("http://localhost:5000/received-messages")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData([]));
  };
  const handleCancel = () => { setEditId(null); setEditMessage(""); setError(""); };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pesan Masuk</h2>
      <div className="flex justify-end">
        <input
          type="text"
          className="border p-2 rounded mb-2 w-full max-w-xs"
          placeholder="Cari nomor atau pesan..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>
      {editId && (
        <form onSubmit={handleUpdate} className="mb-2 flex items-center space-x-2">
          <input
            type="text"
            className="border p-2 rounded w-full max-w-lg"
            value={editMessage}
            onChange={e => setEditMessage(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Simpan</button>
          <button type="button" onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded">Batal</button>
          {error && <span className="text-red-500 text-sm ml-2">{error}</span>}
        </form>
      )}
      <DataTable
        columns={columns}
        data={filteredData}
        pagination
        highlightOnHover
        striped
        noDataComponent={<div className="text-center py-2">Belum ada data</div>}
      />
    </div>
  );
}

function Chatbot() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Tidak ada endpoint status, jadi asumsikan off saat reload
    setActive(false);
  }, []);
  const toggle = async () => {
    setLoading(true);
    const res = await fetch("http://localhost:5000/chatbot-toggle", { method: "POST" });
    const data = await res.json();
    setActive(data.active);
    setLoading(false);
  };
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Fitur Chatbot</h2>
      <p className="mb-4">Chatbot akan membalas otomatis pesan "hai" dengan "Halo, ada yang bisa kami bantu?"</p>
      <button
        onClick={toggle}
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${active ? 'bg-green-600' : 'bg-gray-400'} hover:bg-green-700`}
      >
        {loading ? 'Memproses...' : active ? 'Matikan Chatbot' : 'Aktifkan Chatbot'}
      </button>
      <div className="mt-4 text-sm">Status: <span className={active ? 'text-green-600' : 'text-gray-600'}>{active ? 'Aktif' : 'Nonaktif'}</span></div>
    </div>
  );
}

function AutoReply({ token, fetchWithToken }) {
  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [reply, setReply] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");

  const fetchData = () => {
    fetchWithToken("http://localhost:5000/auto-replies")
      .then(res => res.json())
      .then(setData)
      .catch(() => setData([]));
  };
  useEffect(fetchData, [token, fetchWithToken]);

  const filteredData = data.filter(row =>
    row.keyword?.toLowerCase().includes(filterText.toLowerCase()) ||
    row.reply?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const url = editId ? `http://localhost:5000/auto-replies/${editId}` : "http://localhost:5000/auto-replies";
    const method = editId ? "PUT" : "POST";
    const res = await fetchWithToken(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, reply })
    });
    const result = await res.json();
    if (result.status === "success") {
      setKeyword(""); setReply(""); setEditId(null); fetchData();
    } else {
      setError(result.message || "Gagal menyimpan");
      console.error('AutoReply error:', result);
    }
  };

  const handleEdit = (row) => {
    setEditId(row.id); setKeyword(row.keyword); setReply(row.reply);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus auto reply ini?")) return;
    await fetchWithToken(`http://localhost:5000/auto-replies/${id}`, { method: "DELETE" });
    fetchData();
  };
  const handleCancel = () => {
    setEditId(null); setKeyword(""); setReply(""); setError("");
  };

  const columns = [
    { name: 'No', selector: (row, i) => i + 1, width: '60px', sortable: false },
    { name: 'Keyword', selector: row => row.keyword, sortable: true },
    { name: 'Balasan', selector: row => row.reply, sortable: true },
    {
      name: 'Aksi',
      cell: row => (
        <>
          <button onClick={() => handleEdit(row)} className="px-2 py-1 bg-yellow-400 rounded mr-2">Edit</button>
          <button onClick={() => handleDelete(row.id)} className="px-2 py-1 bg-red-500 text-white rounded">Hapus</button>
        </>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '160px'
    }
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Auto Reply</h2>
      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <div>
          <input type="text" className="border p-2 rounded w-64 mr-2" placeholder="Keyword" value={keyword} onChange={e => setKeyword(e.target.value)} required />
          <input type="text" className="border p-2 rounded w-64 mr-2" placeholder="Balasan" value={reply} onChange={e => setReply(e.target.value)} required />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">{editId ? "Update" : "Tambah"}</button>
          {editId && <button type="button" onClick={handleCancel} className="ml-2 px-4 py-2 rounded bg-gray-400 text-white">Batal</button>}
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </form>
      <div className="flex justify-end">
        <input
          type="text"
          className="border p-2 rounded mb-2 w-full max-w-xs"
          placeholder="Cari keyword atau balasan..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>
      <DataTable
        columns={columns}
        data={filteredData}
        pagination
        highlightOnHover
        striped
        noDataComponent={<div className="text-center py-2">Belum ada data</div>}
      />
    </div>
  );
}

function Kontak({ token, fetchWithToken, onSelectContact }) {
  const [data, setData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchData = () => {
    fetchWithToken("http://localhost:5000/contacts")
      .then(res => res.json())
      .then(setData)
      .catch(() => setData([]));
  };
  useEffect(fetchData, [token, fetchWithToken]);

  const filteredData = data.filter(row =>
    row.name?.toLowerCase().includes(filterText.toLowerCase()) ||
    row.number?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const url = editId ? `http://localhost:5000/contacts/${editId}` : "http://localhost:5000/contacts";
    const method = editId ? "PUT" : "POST";
    const res = await fetchWithToken(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number })
    });
    const result = await res.json();
    if (result.status === "success" || result.contact) {
      setName(""); setNumber(""); setEditId(null); fetchData();
    } else {
      setError(result.message || "Gagal menyimpan");
    }
  };

  const handleEdit = (row) => {
    setEditId(row.id); setName(row.name); setNumber(row.number);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Hapus kontak ini?")) return;
    await fetchWithToken(`http://localhost:5000/contacts/${id}`, { method: "DELETE" });
    fetchData();
  };
  const handleCancel = () => {
    setEditId(null); setName(""); setNumber(""); setError("");
  };

  const columns = [
    { name: 'No', selector: (row, i) => i + 1, width: '60px', sortable: false },
    { name: 'Nama', selector: row => row.name, sortable: true },
    { name: 'Nomor', selector: row => row.number, sortable: true },
    {
      name: 'Aksi',
      cell: row => (
        <>
          <button onClick={() => handleEdit(row)} className="px-2 py-1 bg-yellow-400 rounded mr-2">Edit</button>
          <button onClick={() => handleDelete(row.id)} className="px-2 py-1 bg-red-500 text-white rounded">Hapus</button>
          {onSelectContact && (
            <button
              onClick={() => {
                onSelectContact(row);
                navigate('/kirim');
              }}
              className="px-2 py-1 bg-green-500 text-white rounded ml-2"
            >Chat</button>
          )}
        </>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '200px'
    }
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Kontak</h2>
      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <div>
          <input type="text" className="border p-2 rounded w-64 mr-2" placeholder="Nama" value={name} onChange={e => setName(e.target.value)} required />
          <input type="text" className="border p-2 rounded w-64 mr-2" placeholder="Nomor WhatsApp (628xxxxxx)" value={number} onChange={e => setNumber(e.target.value)} required />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">{editId ? "Update" : "Tambah"}</button>
          {editId && <button type="button" onClick={handleCancel} className="ml-2 px-4 py-2 rounded bg-gray-400 text-white">Batal</button>}
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </form>
      <div className="flex justify-end">
        <input
          type="text"
          className="border p-2 rounded mb-2 w-full max-w-xs"
          placeholder="Cari nama atau nomor..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>
      <DataTable
        columns={columns}
        data={filteredData}
        pagination
        highlightOnHover
        striped
        noDataComponent={<div className="text-center py-2">Belum ada data</div>}
      />
    </div>
  );
}

function Sidebar({ onLogout, loadingLogout, open, onClose }) {
  const location = useLocation();
  const menu = [
    { to: "/", label: "Dashboard" },
    { to: "/kontak", label: "Kontak" },
    { to: "/kirim", label: "Kirim Pesan" },
    { to: "/sent", label: "Pesan Terkirim" },
    { to: "/inbox", label: "Pesan Masuk" },
    
    // { to: "/chatbot", label: "Chatbot" },
    { to: "/autoreply", label: "Auto Reply" },
  ];
  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-40 z-30 transition-opacity md:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-64 bg-green-700 text-white flex flex-col py-6 px-4 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ minHeight: '100vh' }}
      >
        <div className="text-2xl font-bold mb-8 text-center">WA Gateway</div>
        <nav className="flex-1 space-y-4">
          {menu.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`block py-2 px-3 rounded hover:bg-green-800 ${location.pathname === item.to ? 'bg-green-900 font-bold' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <button
            onClick={onLogout}
            disabled={loadingLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded disabled:opacity-50"
          >
            {loadingLogout ? "Menghapus Sesi..." : "Logout / Hapus Sesi"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Login({ setToken }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
      } else {
        setError(data.message || "Login gagal");
      }
    } catch (err) {
      setError("Tidak bisa terhubung ke server");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold mb-2 text-center">Login Admin</h2>
        <input type="text" className="border p-2 rounded w-full" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="password" className="border p-2 rounded w-full" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Login</button>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
      </form>
    </div>
  );
}

// Navbar/topbar komponen
function Navbar({ onToggleSidebar, connected }) {
  return (
    <header className="flex items-center justify-between bg-white shadow px-4 py-3 sticky top-0 z-20">
      <div className="flex items-center">
        {/* Tombol burger untuk mobile */}
        <button
          className="md:hidden mr-3 text-2xl focus:outline-none"
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <span>☰</span>
        </button>
        <span className="text-xl font-bold text-green-700">WA Gateway</span>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`font-semibold text-sm px-3 py-1 rounded ${connected ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'}`}
        >
          {connected ? 'Terhubung' : 'Tidak Terhubung'}
        </span>
      </div>
    </header>
  );
}

function App() {
  const [message, setMessage] = useState("Memuat...");
  const [qr, setQr] = useState(null);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [connected, setConnected] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Helper fetch with token
  const fetchWithToken = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
  };

  // Polling status koneksi dan QR code
  useEffect(() => {
    if (!token) return; // Jangan polling jika belum login
    const statusInterval = setInterval(() => {
      fetch("http://localhost:5000/status")
        .then((res) => res.json())
        .then((data) => setConnected(data.connected))
        .catch(() => setConnected(false));
    }, 2000);

    let qrInterval = null;
    if (!connected) {
      qrInterval = setInterval(() => {
        fetch("http://localhost:5000/get-qr")
          .then((res) => res.json())
          .then((data) => setQr(data.qr))
          .catch(() => setQr(null));
      }, 2000);
    } else {
      setQr(null);
    }

    return () => {
      clearInterval(statusInterval);
      if (qrInterval) clearInterval(qrInterval);
    };
  }, [connected, token]);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:5000/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Gagal mengambil data dari backend"));
  }, [token]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSendStatus("Mengirim...");
    try {
      const res = await fetchWithToken("http://localhost:5000/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.includes("@s.whatsapp.net") ? to : to + "@s.whatsapp.net",
          message: text,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSendStatus("Pesan terkirim");
        setTo("");
        setText("");
        // Hapus: setData (tidak ada di App)
      } else {
        setSendStatus(data.message || "Gagal mengirim pesan");
      }
    } catch (err) {
      setSendStatus("Tidak bisa terhubung ke server");
    }
  };

  const handleLogout = async () => {
    setLoadingLogout(true);
    // Hanya hapus token di client, tidak perlu ke server
    setToken("");
    localStorage.removeItem("token");
    setLoadingLogout(false);
  };

  // Jika belum login, tampilkan halaman login
  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar onLogout={handleLogout} loadingLogout={loadingLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} connected={connected} />
          <main className="flex-1 p-2 md:p-4">
            <div className="bg-white rounded-lg shadow p-4 md:p-6 min-h-[80vh]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/kirim" element={<KirimPesan connected={connected} qr={qr} handleSend={handleSend} to={to} setTo={setTo} text={text} setText={setText} sendStatus={sendStatus} selectedContact={selectedContact} setSelectedContact={setSelectedContact} token={token} fetchWithToken={fetchWithToken} />} />
                <Route path="/sent" element={<PesanTerkirim token={token} fetchWithToken={fetchWithToken} />} />
                <Route path="/inbox" element={<PesanMasuk token={token} fetchWithToken={fetchWithToken} />} />
                <Route path="/kontak" element={<Kontak token={token} fetchWithToken={fetchWithToken} onSelectContact={c => { setTo(c.number); setSelectedContact(c); }} />} />
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/autoreply" element={<AutoReply token={token} fetchWithToken={fetchWithToken} />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;