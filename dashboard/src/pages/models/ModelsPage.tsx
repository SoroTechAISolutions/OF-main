import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, Pencil, Trash2, Link2, Loader2 } from 'lucide-react';
import type { Model } from '../../types';
import api from '../../services/api';

const PERSONAS: Record<string, { name: string; color: string }> = {
  gfe_sweet: { name: 'GFE Sweet', color: 'bg-pink-500' },
  dominant: { name: 'Dominant', color: 'bg-purple-500' },
  gamer_girl: { name: 'Gamer Girl', color: 'bg-green-500' },
  milf: { name: 'MILF', color: 'bg-red-500' },
  luxury: { name: 'Luxury', color: 'bg-yellow-500' },
};

const PLATFORM_BADGES: Record<string, { label: string; color: string }> = {
  onlyfans: { label: 'OnlyFans', color: 'bg-blue-500/20 text-blue-400' },
  fanvue: { label: 'Fanvue', color: 'bg-purple-500/20 text-purple-400' },
  both: { label: 'Multi-platform', color: 'bg-green-500/20 text-green-400' },
};

export function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await api.getModels();
      if (response.success && response.data) {
        setModels(response.data);
      }
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await api.deleteModel(id);
      setModels(models.filter((m) => m.id !== id));
    } catch {
      alert('Failed to delete model');
    }
    setOpenMenu(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Models</h1>
          <p className="text-dark-400 mt-1">Manage your creator profiles</p>
        </div>
        <Link to="/models/new" className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          Add Model
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Models Grid */}
      {models.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-dark-400 mb-4">No models yet. Add your first model to get started.</p>
          <Link to="/models/new" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Model
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const persona = model.persona_id ? PERSONAS[model.persona_id] : { name: 'Unknown', color: 'bg-gray-500' };
            const platform = PLATFORM_BADGES[model.platform] || PLATFORM_BADGES.onlyfans;

            return (
              <div key={model.id} className="card relative">
                {/* Menu button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setOpenMenu(openMenu === model.id ? null : model.id)}
                    className="p-1 hover:bg-dark-700 rounded"
                  >
                    <MoreVertical className="w-5 h-5 text-dark-400" />
                  </button>

                  {openMenu === model.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-dark-700 border border-dark-600 rounded-lg shadow-lg py-1 z-10">
                      <Link
                        to={`/models/${model.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-dark-200 hover:bg-dark-600"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Link>
                      {model.platform !== 'onlyfans' && (
                        <Link
                          to={`/models/${model.id}/fanvue`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-dark-200 hover:bg-dark-600"
                        >
                          <Link2 className="w-4 h-4" />
                          Connect Fanvue
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-600 w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Model info */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold">
                    {model.display_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{model.display_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platform.color}`}>
                        {platform.label}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          model.ai_enabled ? 'bg-green-500' : 'bg-dark-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Persona */}
                <div className="mt-4 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${persona.color}`} />
                  <span className="text-sm text-dark-300">Persona: {persona.name}</span>
                </div>

                {/* Stats */}
                {model.stats && (
                  <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-white">{model.stats.total_messages}</p>
                      <p className="text-xs text-dark-400">Messages</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{model.stats.ai_responses}</p>
                      <p className="text-xs text-dark-400">AI Responses</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{model.stats.avg_response_time}s</p>
                      <p className="text-xs text-dark-400">Avg Time</p>
                    </div>
                  </div>
                )}

                {/* OnlyFans status */}
                {model.platform !== 'fanvue' && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-400">OnlyFans</span>
                      {model.of_username ? (
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          @{model.of_username}
                        </span>
                      ) : (
                        <Link
                          to={`/models/${model.id}/edit`}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          Add username →
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Fanvue status */}
                {model.platform !== 'onlyfans' && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-400">Fanvue</span>
                      {model.fanvue_user_uuid ? (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Connected
                        </span>
                      ) : (
                        <Link
                          to={`/models/${model.id}/fanvue`}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          Connect →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
