// Câble les implémentations de data/ aux use cases de domain/.
// Instancié une fois, exposé aux hooks via DependenciesProvider.
// Vide à l'amorçage — un câblage par module fonctionnel, au fur et à mesure
// que domain/usecases/ et data/repositories/ se remplissent.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- vide à l'amorçage, s'étoffe module par module
export interface Container {}

export function createContainer(): Container {
  return {}
}
