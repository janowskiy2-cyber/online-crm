import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Phone, 
  Mail, 
  Send, 
  Search, 
  ExternalLink,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { Contact, Company } from '../../types';

interface ContactsViewProps {
  onOpenDeal: (dealId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onOpenDeal }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'companies'>('contacts');
  const [search, setSearch] = useState('');

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts', { params: { search } });
      setContacts(res.data);
    } catch (e) {
      console.error('Failed to load contacts:', e);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/contacts/companies/all');
      setCompanies(res.data);
    } catch (e) {
      console.error('Failed to load companies:', e);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, [search]);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-500" />
              <span>Клиентская база</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Контакты, компании и история взаимодействия в WhatsApp и Telegram
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'contacts' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Контакты ({contacts.length})
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'companies' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Компании ({companies.length})
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Поиск по имени, телефону, email или никнейму..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Contacts Grid */}
        {activeTab === 'contacts' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-[#111827] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-3 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{contact.name}</h3>
                      <p className="text-xs text-slate-400">{contact.position || 'Клиент'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-400">WA:</span>
                      <span>{contact.whatsapp}</span>
                    </div>
                  )}
                  {contact.telegram && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-sky-400">TG:</span>
                      <span>{contact.telegram}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-purple-300">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate">{contact.company.name}</span>
                    </div>
                  )}
                </div>

                {contact.deals && contact.deals.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Связанные сделки:
                    </span>
                    <div className="space-y-1">
                      {contact.deals.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => onOpenDeal(d.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-between cursor-pointer py-0.5"
                        >
                          <span className="truncate">{d.title}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Companies Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((comp) => (
              <div
                key={comp.id}
                className="bg-[#111827] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-3 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{comp.name}</h3>
                    <p className="text-xs text-slate-400">{comp.website || comp.email}</p>
                  </div>
                </div>

                {comp.address && (
                  <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                    {comp.address}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
