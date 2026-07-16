import { AddReleaseForm } from "./AddReleaseForm";

export const metadata = { title: "Add a record" };

export default function AddReleasePage() {
  return (
    <div className="flex min-h-[80vh] flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-semibold">Add a record</h1>
      <AddReleaseForm />
    </div>
  );
}
