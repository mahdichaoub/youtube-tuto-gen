import { NeuralMeshBg } from "@/components/neural-mesh-bg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: "oklch(0.085 0.006 265)" }}>
      <NeuralMeshBg />
      <div className="relative z-10 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
