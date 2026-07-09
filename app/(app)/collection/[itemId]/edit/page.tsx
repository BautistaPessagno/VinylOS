import { notFound } from "next/navigation";
import { getEditItemData, updateItemAction } from "../../actions";
import { EditEditionSection } from "./EditEditionSection";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      )}
    </label>
  );
}

export default async function EditCollectionItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = await getEditItemData(Number(itemId));
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-zinc-100">
          {item.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <p className="text-sm text-zinc-500">
            {[item.year, item.labelName, item.catalogNumber, item.country]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {item.masterId && (
        <div className="max-w-2xl">
          <EditEditionSection itemId={item.id} masterId={item.masterId} />
        </div>
      )}

      <form action={updateItemAction} className="flex max-w-2xl flex-col gap-4">
        <input type="hidden" name="itemId" value={item.id} />
        <Field label="Folder" name="folder" defaultValue={item.folder} />
        <Field label="Rating (1-5)" name="rating" type="number" defaultValue={item.rating} />
        <Field
          label="Media condition"
          name="mediaCondition"
          defaultValue={item.mediaCondition}
        />
        <Field
          label="Sleeve condition"
          name="sleeveCondition"
          defaultValue={item.sleeveCondition}
        />
        <Field
          label="Purchase price"
          name="purchasePrice"
          type="number"
          defaultValue={item.purchasePrice}
        />
        <Field
          label="Purchase date"
          name="purchaseDate"
          type="date"
          defaultValue={item.purchaseDate}
        />
        <Field
          label="Purchase location"
          name="purchaseLocation"
          defaultValue={item.purchaseLocation}
        />
        <Field label="Notes" name="notes" defaultValue={item.notes} textarea />

        <button type="submit" className="mt-2 self-start rounded bg-black px-4 py-2 text-white">
          Save changes
        </button>
      </form>
    </div>
  );
}
