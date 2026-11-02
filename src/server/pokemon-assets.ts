const ASSET_BASE_URL = "https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon";

function assetFormId(formId: string): string | undefined {
  if (formId.toLowerCase() === "normal") return undefined;
  return formId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function pokemonIconUrl(pokemonId: number, formId: string): string {
  const form = assetFormId(formId);
  return `${ASSET_BASE_URL}/pm${pokemonId}${form ? `.f${form}` : ""}.icon.png`;
}
