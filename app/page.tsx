import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
        LINKEDO
      </h1>
      <p className="text-slate-400 max-w-lg mb-8 text-lg">
        The ultimate professional dashboard for LinkedIn. Create content, engage with peers, and grow your network with AI.
      </p>
      <Link
        href="/overview"
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
