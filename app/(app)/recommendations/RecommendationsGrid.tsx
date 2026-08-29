import Link from "next/link";
import {
  listRecommendations,
  generateRecommendations,
} from "@/lib/services/recommendationService";
import {
  collectRecommendationGenres,
  filterRecommendationsByGenre,
  parseRecommendationSort,
  sortRecommendations,
} from "@/lib/services/recommendationSort";
import {
  dismissRecommendationAction,
  addRecommendationToCollectionAction,
} from "./actions";
import { RecommendationsFilters } from "./RecommendationsFilters";
import { addReleaseToWishlistAction } from "../wishlist/actions";
import { LibraryActionForm } from "../LibraryActionForm";
import { SubmitButton } from "../SubmitButton";

const ACTION_CLASS = "-mx-1 min-h-11 px-1 underline active:opacity-70";
const IN_LIST_CLASS = "-mx-1 inline-flex min-h-11 items-center px-1 text-room-dim";

/**
 * Async server component streamed inside a <Suspense>. On first visit (no cached
 * recommendations) it generates them, then lists; on later visits it shows the cached
 * set immediately. Server components render once per request, so there's no double run.
 */
export async function RecommendationsGrid({
  userId,
  genre,
  sort,
}: {
  userId: string;
  genre?: string;
  sort?: string;
}) {
  let items = await listRecommendations(userId);
  if (items.length === 0) {
    await generateRecommendations(userId);
    items = await listRecommendations(userId);
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-room-dim">
        No recommendations yet — add a few records to your collection and we&apos;ll
        suggest more based on your taste.
      </p>
    );
  }

  const normalized = items.map((item) => ({ ...item, genres: item.genres ?? [] }));
  const genreOptions = collectRecommendationGenres(normalized);
  const selectedSort = parseRecommendationSort(sort);
  const visible = sortRecommendations(
    filterRecommendationsByGenre(normalized, genre),
    selectedSort,
  );

  return (
    <div className="flex flex-col gap-6">
      <RecommendationsFilters
        selectedGenre={genre?.trim() || undefined}
        selectedSort={selectedSort}
        genres={genreOptions}
      />

      {visible.length === 0 ? (
        <p className="text-center text-room-dim">
          Ninguna recomendación coincide con esos filtros.{" "}
          <Link href="/recommendations" className="underline">
            Borra los filtros.
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((item) => (
        <div
          key={item.recId}
          className="flex flex-col gap-2 rounded border border-room-rule p-3"
        >
          <Link
            href={`/album/${item.releaseId}?from=/recommendations`}
            className="aspect-square w-full overflow-hidden rounded bg-room-sunk active:opacity-80"
          >
            {item.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverUrl}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            )}
          </Link>
          <div className="flex flex-col">
            <Link href={`/album/${item.releaseId}?from=/recommendations`} className="truncate font-medium hover:underline">
              {item.title}
            </Link>
            <span className="truncate text-sm text-room-dim">
              {item.artistNames.join(", ")}
            </span>
            <span className="text-xs text-room-dim">{item.reason}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {/* Recommendations already exclude anything in the library, so these two
                only ever start in the offerable state. */}
            <LibraryActionForm
              action={addRecommendationToCollectionAction}
              fields={{ releaseId: item.releaseId }}
              label="Añadir"
              inListLabel="En tu colección"
              pendingText="Añadiendo…"
              className={ACTION_CLASS}
              inListClassName={IN_LIST_CLASS}
            />
            <LibraryActionForm
              action={addReleaseToWishlistAction}
              fields={{ releaseId: item.releaseId }}
              label="Lista de deseos"
              inListLabel="En tu lista de deseos"
              pendingText="Añadiendo…"
              className={ACTION_CLASS}
              inListClassName={IN_LIST_CLASS}
            />
            <form action={dismissRecommendationAction} className="ml-auto">
              <input type="hidden" name="recId" value={item.recId} />
              <SubmitButton
                pendingText="Descartando…"
                className="-mx-1 min-h-11 px-1 text-room-danger underline active:opacity-70"
              >
                Descartar
              </SubmitButton>
            </form>
          </div>
        </div>
          ))}
        </div>
      )}
    </div>
  );
}
