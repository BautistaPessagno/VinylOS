import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="max-w-md text-room-dim">
        Parece que ese disco no está en la caja. Puede que se haya eliminado o que
        el enlace sea incorrecto.
      </p>
      <Link
        href="/collection"
        className="min-h-11 rounded-lg bg-room-accent px-5 py-2.5 font-medium text-room-on-accent hover:opacity-90 active:opacity-90"
      >
        Volver a tu colección
      </Link>
    </div>
  );
}
