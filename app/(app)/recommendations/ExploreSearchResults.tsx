import Link from "next/link";
import type {
  DiscogsAlbumGroup,
  DiscogsArtistSearchResult,
  DiscogsSongResult,
} from "@/lib/discogs/types";
import { matchScore, rankSections } from "@/lib/search/rankSearchResults";
import type { ExploreSearchResult } from "./actions";
import { openExploreAlbumAction } from "./actions";
import { DiscoveryAlbumCard } from "./DiscoveryAlbumCard";

function ArtistImage({ name, imageUrl }: { name: string; imageUrl?: string }) {
  return (
    <div className="aspect-square overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xl font-semibold text-zinc-500">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

const HERO_CARD_CLASS =
  "flex min-h-40 w-full items-center gap-5 rounded-2xl border border-zinc-200 bg-zinc-100 p-5 text-left transition-colors hover:border-red-400 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800";

function TopArtistCard({ artist }: { artist: DiscogsArtistSearchResult }) {
  return (
    <Link href={`/artist/${artist.id}`} className={HERO_CARD_CLASS}>
      <div className="w-24 shrink-0 sm:w-28">
        <ArtistImage name={artist.name} imageUrl={artist.imageUrl} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold sm:text-3xl">{artist.name}</p>
        <p className="mt-2 text-sm text-zinc-500">Artist</p>
      </div>
    </Link>
  );
}

function HeroCover({ imageUrl, alt }: { imageUrl?: string; alt: string }) {
  return (
    <div className="aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800 sm:w-28">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function TopAlbumCard({
  album,
  returnTo,
}: {
  album: DiscogsAlbumGroup;
  returnTo: string;
}) {
  return (
    <form action={openExploreAlbumAction}>
      <input type="hidden" name="artist" value={album.artist} />
      <input type="hidden" name="album" value={album.title} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" title={`View ${album.title}`} className={HERO_CARD_CLASS}>
        <HeroCover
          imageUrl={album.coverImage}
          alt={`${album.title} by ${album.artist}`}
        />
        <span className="min-w-0">
          <span className="block truncate text-2xl font-semibold sm:text-3xl">
            {album.title}
          </span>
          <span className="mt-2 block text-sm text-zinc-500">
            Record · {album.artist}
          </span>
        </span>
      </button>
    </form>
  );
}

/** A track-search hit, shown as the record that contains the song (Discogs track
 * search returns records, not songs — the badge names the matched track). */
function TopSongCard({
  song,
  returnTo,
}: {
  song: DiscogsSongResult;
  returnTo: string;
}) {
  return (
    <form action={openExploreAlbumAction}>
      <input type="hidden" name="artist" value={song.artist} />
      <input type="hidden" name="album" value={song.albumTitle} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" title={`View ${song.albumTitle}`} className={HERO_CARD_CLASS}>
        <HeroCover
          imageUrl={song.coverImage}
          alt={`${song.albumTitle} by ${song.artist}`}
        />
        <span className="min-w-0">
          <span className="mb-1 inline-block max-w-full truncate rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            Contains “{song.trackTitle}”
          </span>
          <span className="block truncate text-2xl font-semibold sm:text-3xl">
            {song.albumTitle}
          </span>
          <span className="mt-1 block truncate text-sm text-zinc-500">
            Record · {song.artist}
          </span>
        </span>
      </button>
    </form>
  );
}

const ALBUM_SCORE_CANDIDATES = 3;

export function ExploreSearchResults({
  result,
  returnTo,
}: {
  result: ExploreSearchResult;
  returnTo: string;
}) {
  if (
    result.artists.length === 0 &&
    result.albums.length === 0 &&
    result.songs.length === 0
  ) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-center text-zinc-500 dark:border-zinc-700">
        No artists, records or songs found for “{result.query}”
      </p>
    );
  }

  const sectionOrder = rankSections({
    artistScore: result.artists[0] ? matchScore(result.query, result.artists[0].name) : 0,
    albumScore: Math.max(
      0,
      ...result.albums
        .slice(0, ALBUM_SCORE_CANDIDATES)
        .map((album) => matchScore(result.query, album.title)),
    ),
    songScore: Math.max(
      0,
      ...result.songs.map((song) => matchScore(result.query, song.trackTitle)),
    ),
  });
  // The hero is the first item of the highest-ranked section with results; it is
  // excluded from its own section below.
  const heroSection = sectionOrder.find((section) =>
    section === "artists"
      ? result.artists.length > 0
      : section === "albums"
        ? result.albums.length > 0
        : result.songs.length > 0,
  );

  const artists =
    heroSection === "artists" ? result.artists.slice(1) : result.artists;
  const albums = heroSection === "albums" ? result.albums.slice(1) : result.albums;
  const songs = heroSection === "songs" ? result.songs.slice(1) : result.songs;

  const sections = sectionOrder.map((section) => {
    if (section === "artists") {
      return (
        artists.length > 0 && (
          <section key="artists" aria-labelledby="artists-heading">
            <h2 id="artists-heading" className="mb-3 text-lg font-semibold">
              Artists
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artist/${artist.id}`}
                  className="rounded-xl border border-zinc-200 p-3 transition-colors hover:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-zinc-800"
                >
                  <ArtistImage name={artist.name} imageUrl={artist.imageUrl || artist.thumbUrl} />
                  <p className="mt-3 truncate font-medium">{artist.name}</p>
                  <p className="text-xs text-zinc-500">Artist</p>
                </Link>
              ))}
            </div>
          </section>
        )
      );
    }
    if (section === "albums") {
      return (
        albums.length > 0 && (
          <section key="albums" aria-labelledby="records-heading">
            <h2 id="records-heading" className="mb-3 text-lg font-semibold">
              Records
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {albums.map((album) => (
                <DiscoveryAlbumCard
                  key={album.key}
                  album={{
                    artist: album.artist,
                    title: album.title,
                    imageUrl: album.coverImage,
                    year: album.year,
                    editionCount: album.editionCount,
                  }}
                  returnTo={returnTo}
                />
              ))}
            </div>
          </section>
        )
      );
    }
    return (
      songs.length > 0 && (
        <section key="songs" aria-labelledby="songs-heading">
          <h2 id="songs-heading" className="mb-3 text-lg font-semibold">
            Records with this song
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {songs.map((song) => (
              <DiscoveryAlbumCard
                key={song.key}
                album={{
                  artist: song.artist,
                  title: song.albumTitle,
                  imageUrl: song.coverImage,
                  year: song.year,
                  containsTrack: song.trackTitle,
                }}
                returnTo={returnTo}
              />
            ))}
          </div>
        </section>
      )
    );
  });

  return (
    <div className="flex flex-col gap-9">
      {heroSection && (
        <section aria-labelledby="top-result-heading">
          <h2 id="top-result-heading" className="mb-3 text-lg font-semibold">
            Top result
          </h2>
          {heroSection === "artists" && <TopArtistCard artist={result.artists[0]} />}
          {heroSection === "albums" && (
            <TopAlbumCard album={result.albums[0]} returnTo={returnTo} />
          )}
          {heroSection === "songs" && (
            <TopSongCard song={result.songs[0]} returnTo={returnTo} />
          )}
        </section>
      )}
      {sections}
    </div>
  );
}
