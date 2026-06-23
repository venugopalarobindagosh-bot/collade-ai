export default function GuaranteeBadge() {
  return (
    <section className="w-full py-8 px-4 bg-black border-t border-white/8">
      <div className="max-w-2xl mx-auto flex justify-center">
        <div className="bg-white/4 border border-white/12 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full">
          <div className="text-4xl">🔒</div>
          <div>
            <p className="text-white font-bold text-base">7-Day Refund on Unused Credits</p>
            <p className="text-white/50 text-sm mt-1">No auto-renewal. Ever. You buy once and use whenever you want — no recurring charges.</p>
          </div>
        </div>
      </div>
    </section>
  );
}