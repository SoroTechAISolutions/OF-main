import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { Persona, CreateModelRequest, UpdateModelRequest } from '../../types';
import api from '../../services/api';

const DEFAULT_PERSONAS: Persona[] = [
  { id: 'gfe_sweet', name: 'GFE Sweet', style: 'Warm, caring girlfriend', description: 'Affectionate and supportive', audience: 'Lonely guys seeking connection' },
  { id: 'dominant', name: 'Dominant', style: 'Cold, commanding mistress', description: 'Assertive and controlling', audience: 'Submissive men' },
  { id: 'gamer_girl', name: 'Gamer Girl', style: 'Playful, nerdy egirl', description: 'Fun and relatable', audience: 'Gaming community' },
  { id: 'milf', name: 'MILF', style: 'Experienced, confident', description: 'Mature and knowing', audience: 'Younger men' },
  { id: 'luxury', name: 'Luxury', style: 'Exclusive, high-end', description: 'Premium and sophisticated', audience: 'High spenders' },
];

export function ModelFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [ofUsername, setOfUsername] = useState('');
  const [platform, setPlatform] = useState<'onlyfans' | 'fanvue' | 'both'>('onlyfans');
  const [personaId, setPersonaId] = useState('gfe_sweet');
  const [status, setStatus] = useState<'active' | 'paused' | 'inactive'>('active');
  const [personas, setPersonas] = useState<Persona[]>(DEFAULT_PERSONAS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPersonas();
    if (isEdit && id) {
      loadModel(id);
    }
  }, [id]);

  const loadPersonas = async () => {
    try {
      const response = await api.getPersonas();
      if (response.success && response.data) {
        setPersonas(response.data);
      }
    } catch {
      // Use default personas
    }
  };

  const loadModel = async (modelId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getModel(modelId);
      if (response.success && response.data) {
        const model = response.data;
        setName(model.display_name);
        setOfUsername(model.of_username || '');
        setPlatform(model.platform);
        setPersonaId(model.persona_id || 'gfe_sweet');
        setStatus(model.ai_enabled ? 'active' : 'inactive');
      } else {
        setError('Model not found');
      }
    } catch {
      setError('Failed to load model');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      if (isEdit && id) {
        const data: UpdateModelRequest = {
          display_name: name,
          of_username: ofUsername,
          platform,
          persona_id: personaId,
          ai_enabled: status === 'active'
        };
        await api.updateModel(id, data);
      } else {
        const data: CreateModelRequest = {
          display_name: name,
          of_username: ofUsername,
          platform,
          persona_id: personaId
        };
        await api.createModel(data);
      }
      navigate('/models');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/models')}
          className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-dark-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Edit Model' : 'Add New Model'}
          </h1>
          <p className="text-dark-400 mt-1">
            {isEdit ? 'Update model settings' : 'Create a new creator profile'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">
              Model Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Jessica, Emma..."
              required
            />
          </div>

          {/* OF Username */}
          {(platform === 'onlyfans' || platform === 'both') && (
            <div>
              <label htmlFor="ofUsername" className="label">
                OnlyFans Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">@</span>
                <input
                  type="text"
                  id="ofUsername"
                  value={ofUsername}
                  onChange={(e) => setOfUsername(e.target.value.replace('@', ''))}
                  className="input pl-8"
                  placeholder="username"
                  required
                />
              </div>
              <p className="text-xs text-dark-400 mt-1">
                The username from onlyfans.com/@username
              </p>
            </div>
          )}

          {/* Platform */}
          <div>
            <label className="label">Platform</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'onlyfans', label: 'OnlyFans' },
                { value: 'fanvue', label: 'Fanvue' },
                { value: 'both', label: 'Both' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlatform(opt.value as typeof platform)}
                  className={`px-4 py-3 rounded-lg border transition-colors ${
                    platform === opt.value
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-dark-600 bg-dark-800 text-dark-300 hover:border-dark-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Persona */}
          <div>
            <label className="label">AI Persona</label>
            <div className="space-y-3">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setPersonaId(persona.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    personaId === persona.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${personaId === persona.id ? 'text-primary-400' : 'text-dark-100'}`}>
                        {persona.name}
                      </p>
                      <p className="text-sm text-dark-400">{persona.style}</p>
                    </div>
                    <span className="text-xs text-dark-500">{persona.audience}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="input"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEdit ? 'Update Model' : 'Create Model'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/models')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
