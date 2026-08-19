import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, RefreshCw, CheckCircle2, Sparkles, Copy, Check } from 'lucide-react';
import type { TikTokConfig } from '../types/crm';
import { tiktokService } from '../services/tiktokService';

interface TikTokConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
}

export const TikTokConfigModal: React.FC<TikTokConfigModalProps> = ({
  isOpen,
  onClose,
  empresaId,
}) => {
  const [config, setConfig] = useState<Partial<TikTokConfig>>({
    tiktok_app_id: '',
    tiktok_app_secret: '',
    access_token: '',
    modo_sandbox: true,
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [copiado, setCopiado] = useState(false);

  // URL sugerida para el webhook de TikTok
  const webhookUrl = `${window.location.origin}/api/crm/tiktok/webhook`;

  useEffect(() => {
    if (isOpen && empresaId) {
      cargarConfig();
    }
  }, [isOpen, empresaId]);

  const cargarConfig = async () => {
    try {
      setLoading(true);
      const data = await tiktokService.fetchConfiguracion(empresaId);
      if (data) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Error al cargar config:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await tiktokService.guardarConfiguracion({
        ...config,
        empresa_id: empresaId,
      });
      setMensajeExito('Configuración guardada correctamente.');
      setTimeout(() => {
        setMensajeExito('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error al guardar configuración:', err);
    } finally {
      setGuardando(false);
    }
  };

  const copiarWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Cabecera del Modal */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Configurar API TikTok</h3>
              <p className="text-[11px] text-slate-400">Credenciales y Webhook CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-xs">Cargando datos...</span>
            </div>
          ) : (
            <>
              {mensajeExito && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{mensajeExito}</span>
                </div>
              )}

              {/* Modo Sandbox Toggle */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Modo Sandbox (Pruebas)
                  </span>
                  <p className="text-[11px] text-blue-700">
                    Permite probar el CRM simulando mensajes entrantes en desarrollo.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.modo_sandbox ?? true}
                  onChange={(e) => setConfig({ ...config, modo_sandbox: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Campo TikTok App ID */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  TikTok App ID
                </label>
                <input
                  type="text"
                  placeholder="ej. 718293849102938"
                  value={config.tiktok_app_id || ''}
                  onChange={(e) => setConfig({ ...config, tiktok_app_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                />
              </div>

              {/* Campo TikTok App Secret */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  TikTok App Secret
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={config.tiktok_app_secret || ''}
                  onChange={(e) => setConfig({ ...config, tiktok_app_secret: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 font-mono"
                />
              </div>

              {/* Access Token */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Access Token (Manual / Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Pega aquí el Token de acceso si lo tienes, o conéctalo automáticamente abajo..."
                  value={config.access_token || ''}
                  onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 font-mono resize-none"
                />
              </div>

              {/* Conectar Cuenta OAuth (Solo si no es Sandbox y tiene App ID) */}
              {!config.modo_sandbox && config.tiktok_app_id && (
                <div className="pt-1">
                  {config.access_token ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="text-[11px] text-emerald-800 font-semibold leading-tight">
                            Cuenta de TikTok Vinculada
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setGuardando(true);
                              const updated = {
                                ...config,
                                access_token: '',
                                refresh_token: '',
                                activo: false,
                                empresa_id: empresaId,
                              };
                              await tiktokService.guardarConfiguracion(updated);
                              setConfig(updated);
                              setMensajeExito('Cuenta desvinculada correctamente.');
                              setTimeout(() => setMensajeExito(''), 2000);
                            } catch (err) {
                              console.error('Error al desvincular:', err);
                            } finally {
                              setGuardando(false);
                            }
                          }}
                          className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
                        >
                          Desconectar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const redirectUri = window.location.origin + '/crm/tiktok';
                          const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${config.tiktok_app_id}&scope=user.info.basic,user.info.profile&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${empresaId}`;
                          window.location.href = authUrl;
                        }}
                        className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md cursor-pointer border border-slate-700"
                      >
                        <span className="text-sm">🎵</span>
                        <span>Conectar Cuenta de TikTok (Recomendado)</span>
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-1">
                        Te redirigirá a TikTok de forma segura para iniciar sesión y autorizar los permisos de chat.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* URL para Webhook */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>URL del Webhook (Para registrar en TikTok)</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={copiarWebhook}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    {copiado ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiado ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="pt-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {guardando ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Key className="w-3.5 h-3.5" />
                  )}
                  <span>Guardar Configuración</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
