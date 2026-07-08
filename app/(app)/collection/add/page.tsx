import { AddReleaseForm } from "./AddReleaseForm";

export default function AddReleasePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add a record</h1>
      <AddReleaseForm />
    </div>
  );
}
