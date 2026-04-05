"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <h1 className="text-4xl font-bold mb-2">오류 발생</h1>
      <p className="text-gray-500 mb-6">
        잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition"
      >
        다시 시도
      </button>
    </main>
  );
}
