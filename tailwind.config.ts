import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === AI / Primary accent = PMGブルー ===
        brand: {
          50: "#EAF4FC",
          100: "#CFE7FA",
          200: "#A6D3F3",
          300: "#5EA9E6",
          400: "#1E84D4",
          500: "#006CBF", // 主役
          600: "#0C56A0",
          700: "#0A4680",
          800: "#0A3A68",
          900: "#082C4F",
        },
        // === 明るいシアン (AIハイライト・グロー・グラデ終端) ===
        accent: {
          300: "#7FD8F6",
          400: "#33C4F2",
          500: "#00AFEC",
          600: "#0090C8",
          soft: "#E0F5FE",
        },
        // === 情報 = ブルー系 (brandエイリアス) ===
        info: {
          300: "#5EA9E6",
          400: "#1E84D4",
          500: "#006CBF",
          600: "#0C56A0",
        },
        // === テキスト (ライト面) ===
        ink: {
          DEFAULT: "#16375A", // 見出し
          soft: "#49586B", // 本文
          muted: "#8493A5", // 補足
          faint: "#AFBECE", // 無効
        },
        // === サーフェス ===
        surface: {
          DEFAULT: "#FFFFFF", // カード
          sunken: "#EDF3F9", // 入れ子・表ヘッダ・淡バンド
          elevated: "#FFFFFF", // ドロワー・ポップ
          input: "#FFFFFF", // 入力欄
          border: "#D3DFEB", // 既定境界
        },
        // === 境界線 (3段階) ===
        line: {
          subtle: "#E4ECF4",
          DEFAULT: "#D3DFEB",
          strong: "#B7C8D9",
        },
        // === ダーク面 (ネイビー：サイドバー/ヒーロー/表紙/AI処理) ===
        navy: {
          DEFAULT: "#123A5E",
          deep: "#0B2A46",
          darker: "#08192B",
          light: "#1E4E78",
        },
        // 後方互換 (旧 night 参照用のエイリアス)
        night: {
          DEFAULT: "#0B2A46",
          soft: "#123A5E",
          ring: "#1E4E78",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Text",
          "Noto Sans JP",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Segoe UI",
          "Meiryo",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,42,70,0.07), 0 8px 24px -12px rgba(16,42,70,0.14)",
        pop: "0 1px 2px rgba(16,42,70,0.07), 0 18px 44px -18px rgba(16,42,70,0.24)",
        navy: "0 22px 54px -22px rgba(9,32,55,0.6)",
        // AI限定のシアングロー
        glow: "0 0 0 1px rgba(0,175,236,0.35), 0 10px 30px -8px rgba(0,108,191,0.5)",
        "glow-sm": "0 0 0 1px rgba(0,175,236,0.28), 0 6px 18px -6px rgba(0,108,191,0.45)",
        "glow-cyan": "0 0 24px -2px rgba(0,175,236,0.55)",
      },
      letterSpacing: {
        tightish: "-0.02em",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        sweep: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        // オーブのグロー鼓動 (シアン)
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,175,236,0.5)" },
          "50%": { boxShadow: "0 0 0 10px rgba(0,175,236,0)" },
        },
        // AI処理オーブの拡大フェードリング
        ring: {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.1)", opacity: "0" },
        },
        // オービット (回転)
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // チャットのタイピング点
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-3px)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "pulse-soft": "pulse-soft 1.2s ease-in-out infinite",
        sweep: "sweep 2.6s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        ring: "ring 2.4s ease-out infinite",
        orbit: "orbit 14s linear infinite",
        "orbit-rev": "orbit 22s linear infinite reverse",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
