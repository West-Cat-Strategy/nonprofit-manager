import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import { RELATIONSHIP_TYPES } from '../types/contact';

interface PortalRelationship {
  id: string;
  relationship_type: string;
  relationship_label: string | null;
  notes: string | null;
  related_contact_first_name: string | null;
  related_contact_last_name: string | null;
  related_contact_email: string | null;
  related_contact_phone: string | null;
}

export default function PortalPeople() {
  const [relationships, setRelationships] = useState<PortalRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    relationship_type: 'contact_person',
    relationship_label: '',
    notes: '',
  });

  const loadRelationships = async () => {
    try {
      const response = await portalApi.get('/portal/relationships');
      setRelationships(response.data);
    } catch (error) {
      console.error('Failed to load relationships', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRelationships();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await portalApi.post('/portal/relationships', {
        relationship_type: formData.relationship_type,
        relationship_label: formData.relationship_label || undefined,
        notes: formData.notes || undefined,
        related_contact: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        },
      });
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        relationship_type: 'contact_person',
        relationship_label: '',
        notes: '',
      });
      loadRelationships();
    } catch (error) {
      console.error('Failed to add person', error);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this person?')) return;
    try {
      await portalApi.delete(`/portal/relationships/${id}`);
      loadRelationships();
    } catch (error) {
      console.error('Failed to remove relationship', error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Associated People</h2>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-app-text">Add Person</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="first_name"
              placeholder="First name"
              value={formData.first_name}
              onChange={handleChange}
              className="px-3 py-2 border border-app-input-border rounded-md"
              required
            />
            <input
              name="last_name"
              placeholder="Last name"
              value={formData.last_name}
              onChange={handleChange}
              className="px-3 py-2 border border-app-input-border rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="px-3 py-2 border border-app-input-border rounded-md"
            />
            <input
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
              className="px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="relationship_type"
              value={formData.relationship_type}
              onChange={handleChange}
              className="px-3 py-2 border border-app-input-border rounded-md"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              name="relationship_label"
              placeholder="Custom label"
              value={formData.relationship_label}
              onChange={handleChange}
              className="px-3 py-2 border border-app-input-border rounded-md"
            />
          </div>
          <textarea
            name="notes"
            placeholder="Notes"
            value={formData.notes}
            onChange={handleChange}
            className="px-3 py-2 border border-app-input-border rounded-md w-full"
          />
          <button type="submit" className="px-4 py-2 bg-app-accent text-white rounded-md">
            Add Person
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-app-text">Current People</h3>
        {loading ? (
          <p className="text-sm text-app-text-muted mt-2">Loading...</p>
        ) : relationships.length === 0 ? (
          <p className="text-sm text-app-text-muted mt-2">No associated people yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {relationships.map((rel) => (
              <li key={rel.id} className="p-3 border rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-medium text-app-text">
                    {rel.related_contact_first_name} {rel.related_contact_last_name}
                  </div>
                  <div className="text-sm text-app-text-muted">
                    {rel.relationship_label || rel.relationship_type}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(rel.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
