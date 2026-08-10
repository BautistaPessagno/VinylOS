import { AddReleaseForm } from "./AddReleaseForm";

export const metadata = { title: "Añadir un disco" };

export default function AddReleasePage() {
  return (
    <div className="flex min-h-[80vh] flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-semibold">Añadir un disco</h1>
      <AddReleaseForm />
    </div>
  );
}
