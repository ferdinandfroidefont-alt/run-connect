import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'sans': ['Open Sans', 'system-ui', 'sans-serif'],
				'display': ['Montserrat', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'map-control': {
					DEFAULT: 'hsl(var(--map-control-bg))',
					border: 'hsl(var(--map-control-border))',
					hover: 'hsl(var(--map-control-hover))',
					active: 'hsl(var(--map-control-active))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			backgroundImage: {
				'gradient-map': 'var(--gradient-map)',
				'gradient-control': 'var(--gradient-control)'
			},
			boxShadow: {
				'map-control': 'var(--shadow-map-control)',
				'map-panel': 'var(--shadow-map-panel)'
			},
			transitionProperty: {
				'map': 'var(--transition-map)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				// Fade Animations
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px)'
					}
				},
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				// Scale Animations
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'scale-out': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(0.95)', opacity: '0' }
				},
				// Slide Animations
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-in-up': {
					'0%': { transform: 'translateY(100%)' },
					'100%': { transform: 'translateY(0)' }
				},
				// Shimmer Effect for Skeletons
				'shimmer': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				},
				// Gentle Bounce
				'gentle-bounce': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-4px)' }
				},
				// Wiggle
				'wiggle': {
					'0%, 100%': { transform: 'rotate(-3deg)' },
					'50%': { transform: 'rotate(3deg)' }
				},
				// Success Checkmark
				'draw-check': {
					'0%': { 'stroke-dashoffset': '16px' },
					'100%': { 'stroke-dashoffset': '0px' }
				},
				// Heartbeat
				'heartbeat': {
					'0%, 100%': { transform: 'scale(1)' },
					'14%': { transform: 'scale(1.1)' },
					'28%': { transform: 'scale(1)' },
					'42%': { transform: 'scale(1.1)' },
					'70%': { transform: 'scale(1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				// Fade animations
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'fade-in-up': 'fade-in-up 0.4s ease-out', 
				// Scale animations
				'scale-in': 'scale-in 0.2s ease-out',
				'scale-out': 'scale-out 0.2s ease-out',
				// Slide animations
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'slide-in-up': 'slide-in-up 0.3s ease-out',
				// Utility animations
				'shimmer': 'shimmer 2s infinite',
				'gentle-bounce': 'gentle-bounce 2s infinite',
				'wiggle': 'wiggle 1s ease-in-out infinite',
				'draw-check': 'draw-check 0.5s ease-out',
				'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
				// Combined animations
				'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
				'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		// Custom utility classes
		function({ addUtilities }: any) {
			addUtilities({
				// Interactive hover effects
				'.hover-scale': {
					'@apply transition-transform duration-200 hover:scale-105': {},
				},
				'.hover-lift': {
					'@apply transition-all duration-200 hover:-translate-y-1 hover:shadow-lg': {},
				},
				'.hover-glow': {
					'@apply transition-all duration-200 hover:shadow-lg hover:shadow-primary/25': {},
				},
				// Button enhancements
				'.btn-interactive': {
					'@apply transition-all duration-200 active:scale-95 hover:shadow-md': {},
				},
				// Link with underline animation
				'.link-animated': {
					'@apply relative after:content-[""] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-primary after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left': {},
				},
				// Glass morphism effect
				'.glass': {
					'@apply backdrop-blur-lg bg-white/10 border border-white/20': {},
				},
				'.glass-dark': {
					'@apply backdrop-blur-lg bg-black/10 border border-white/10': {},
				},
				// Success state
				'.success-state': {
					'@apply bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200': {},
				},
				// Loading state
				'.loading-state': {
					'@apply opacity-50 pointer-events-none': {},
				},
				// Stagger animation delays
				'.stagger-1': { 'animation-delay': '0.1s' },
				'.stagger-2': { 'animation-delay': '0.2s' },
				'.stagger-3': { 'animation-delay': '0.3s' },
				'.stagger-4': { 'animation-delay': '0.4s' },
				'.stagger-5': { 'animation-delay': '0.5s' },
			});
		}
	],
} satisfies Config;
