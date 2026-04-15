import { ShieldCheck, Shield, Landmark, Key } from 'lucide-react'
import LoginForm from './login-form'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Iniciar Sesión` }

export default function LoginPage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col md:flex-row overflow-hidden">

      {/* Panel izquierdo — Hero */}
      <aside className="hidden md:flex md:w-1/2 lg:w-3/5 bg-on-surface relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f95f2b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ae3200" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="400" cy="300" r="260" fill="url(#glow)" />
            {[...Array(12)].map((_, i) => {
              const angle = (i / 12) * Math.PI * 2
              const x = 400 + Math.cos(angle) * 210
              const y = 300 + Math.sin(angle) * 210
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill="#f95f2b" opacity="0.9" />
                  <line x1="400" y1="300" x2={x} y2={y} stroke="#f95f2b" strokeWidth="1" opacity="0.25" />
                </g>
              )
            })}
            <circle cx="400" cy="300" r="8" fill="#f95f2b" />
          </svg>
        </div>

        <div className="relative z-10 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary-container p-3 rounded-xl">
              <ShieldCheck size={28} strokeWidth={1.75} className="text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white">{PROJECT_NAME}</h1>
          </div>

          <h2 className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            El estándar soberano para{' '}
            <span className="text-primary-container">certificación académica</span>.
          </h2>
          <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-md">
            Acceda a su registro inmutable de logros. Seguridad industrial
            impulsada por tecnología ledger para la educación moderna.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10">
              <Shield size={22} strokeWidth={1.75} className="text-primary-container mb-2" />
              <p className="text-sm font-bold text-white">Encriptación Total</p>
              <p className="text-xs text-white/60 mt-1">Datos protegidos por protocolos de grado militar.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10">
              <Landmark size={22} strokeWidth={1.75} className="text-primary-container mb-2" />
              <p className="text-sm font-bold text-white">Validez Legal</p>
              <p className="text-xs text-white/60 mt-1">Certificados con trazabilidad completa y legal.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Panel derecho — Formulario */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-surface-container-lowest">
        <div className="w-full max-w-md space-y-10">
          {/* Logo mobile */}
          <div className="md:hidden flex justify-center mb-8">
            <h1 className="text-2xl font-black tracking-tighter text-on-surface flex items-center gap-2">
              <ShieldCheck size={24} strokeWidth={1.75} className="text-primary-container" />
              {PROJECT_NAME}
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
              Bienvenido de nuevo
            </h2>
            <p className="text-secondary font-medium">
              Ingrese sus credenciales para acceder al panel.
            </p>
          </div>

          <LoginForm />

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-container-lowest px-4 text-xs font-bold text-outline/60 uppercase tracking-widest">
                Acceso Institucional
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 rounded-lg transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm font-bold">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 rounded-lg transition-colors">
              <Key size={18} strokeWidth={1.75} className="text-on-surface" />
              <span className="text-sm font-bold">SSO</span>
            </button>
          </div>

          <footer className="pt-4 text-center">
            <p className="text-sm text-secondary">
              ¿Nuevo en {PROJECT_NAME}?{' '}
              <a className="text-primary-container font-bold hover:underline" href="#">
                Solicite una cuenta
              </a>
            </p>
            <div className="mt-6 flex justify-center gap-6">
              <a className="text-[10px] font-bold text-outline uppercase tracking-tighter hover:text-primary-container">Términos</a>
              <a className="text-[10px] font-bold text-outline uppercase tracking-tighter hover:text-primary-container">Privacidad</a>
              <a className="text-[10px] font-bold text-outline uppercase tracking-tighter hover:text-primary-container">Soporte</a>
            </div>
          </footer>
        </div>
      </main>

      {/* Indicador de estado */}
      <div className="fixed bottom-6 right-6 hidden lg:block">
        <div className="glass-panel border border-outline-variant/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            Servidores Operativos
          </span>
        </div>
      </div>
    </div>
  )
}
