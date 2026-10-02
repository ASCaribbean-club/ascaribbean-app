// Club-provided text, Saison 2026–2027. Kept verbatim (French) — the club,
// not the app, owns the wording.
export interface LegalSection {
  heading: string
  paragraphs: string[]
}

export const CHARTER_INTRO =
  'Cette charte concerne les joueurs, dirigeants, bénévoles et adhérents de l’AS Caribbean. Chacun contribue à un club accueillant, respectueux et solidaire.'

export const CHARTER_SECTIONS: LegalSection[] = [
  {
    heading: '1. Nos valeurs',
    paragraphs: [
      'Faire vivre l’Alliance en rassemblant, la Solidarité en s’entraidant et le Courage en donnant le meilleur de soi-même. Privilégier l’intérêt collectif et encourager la progression de chacun.',
    ],
  },
  {
    heading: '2. Respect et comportement',
    paragraphs: [
      'Respecter les coéquipiers, encadrants, bénévoles, adversaires, arbitres et supporters. Les insultes, menaces, violences, discriminations et comportements de harcèlement sont incompatibles avec les valeurs du club.',
    ],
  },
  {
    heading: '3. Présence et ponctualité',
    paragraphs: [
      'Respecter les horaires, confirmer ses disponibilités et prévenir l’encadrement dès que possible en cas d’absence ou de retard. Honorer ses engagements sportifs et associatifs.',
    ],
  },
  {
    heading: '4. Discipline sportive',
    paragraphs: [
      'Écouter les consignes, respecter les choix du coach et accepter les remplacements. Exprimer ses désaccords calmement, au moment approprié. Pendant les matchs, le capitaine assure le dialogue avec l’arbitre sur le terrain et le coach les échanges depuis le banc.',
    ],
  },
  {
    heading: '5. Solidarité et vie associative',
    paragraphs: [
      'Soutenir ses partenaires dans la réussite comme dans la difficulté. Participer, selon ses possibilités, aux événements, à l’installation et au rangement du matériel.',
    ],
  },
  {
    heading: '6. Matériel, installations et sécurité',
    paragraphs: [
      'Prendre soin des tenues, équipements et installations. Laisser les lieux propres et restituer le matériel prêté. Signaler toute blessure ou difficulté affectant sa participation et adopter un comportement permettant une pratique sûre.',
    ],
  },
  {
    heading: '7. Cotisation et engagements financiers',
    paragraphs: [
      'Régler sa cotisation selon les modalités communiquées par le club. Tout échéancier doit être convenu avec le bureau. En cas de difficulté, contacter rapidement les responsables pour rechercher une solution.',
    ],
  },
  {
    heading: '8. Licence sportive et frais de licence',
    paragraphs: [
      'Chaque pratiquant concerné s’engage à fournir les documents nécessaires à l’établissement ou au renouvellement de sa licence : identité, photographie et justificatifs requis par la fédération.',
      'La participation aux compétitions officielles est soumise à la validation de la licence et au respect des conditions de qualification et des éventuelles suspensions.',
      'Les frais de licence et leur inclusion éventuelle dans la cotisation sont communiqués par le club avant l’inscription. Tout échéancier doit être convenu avec le bureau.',
      'Le club remet au licencié les informations relatives aux garanties d’assurance associées à sa licence et aux possibilités de garanties complémentaires.',
      'L’acceptation de cette charte ou l’activation du compte ne remplace pas la demande officielle de licence.',
    ],
  },
  {
    heading: '9. Communication et confidentialité',
    paragraphs: [
      'Respecter les personnes dans les groupes de discussion et sur les réseaux sociaux. Préserver les informations personnelles et internes. Demander l’accord des personnes concernées avant de diffuser des contenus privés les représentant. Toute communication officielle au nom du club doit être autorisée par le bureau.',
    ],
  },
  {
    heading: '10. Dialogue et engagement du club',
    paragraphs: [
      'En cas de difficulté ou de conflit, solliciter le coach, un référent, un médiateur ou le bureau. Les manquements sont examinés selon les statuts et le règlement intérieur, en permettant à la personne concernée d’expliquer sa situation.',
      'Le club s’engage à accueillir ses membres avec respect, à écouter leurs difficultés et à favoriser leur progression dans un environnement inclusif et solidaire.',
    ],
  },
]

export const IMAGE_RIGHTS_INTRO =
  'Dans le cadre des entraînements, matchs, tournois et événements de l’AS Caribbean, des photographies et vidéos peuvent être réalisées pour présenter les activités du club.'

export const IMAGE_RIGHTS_SECTIONS: LegalSection[] = [
  {
    heading: 'Finalités',
    paragraphs: ['Présentation des équipes, comptes rendus sportifs, promotion des activités associatives et valorisation de la vie du club.'],
  },
  {
    heading: 'Supports',
    paragraphs: [
      'Site internet et comptes officiels du club sur les réseaux sociaux, affiches, flyers, brochures et bilans associatifs. Les publications en ligne peuvent être consultées dans le monde entier.',
    ],
  },
  {
    heading: 'Durée',
    paragraphs: [
      'De la date de mon accord jusqu’au 30 juin 2027. Toute nouvelle utilisation après cette date nécessite un renouvellement de l’autorisation.',
    ],
  },
  {
    heading: 'Conditions d’utilisation',
    paragraphs: [
      'Cette autorisation est accordée gratuitement. Les images doivent respecter ma dignité et ne pas être utilisées dans un contexte dévalorisant. Leur vente, leur utilisation publicitaire par un partenaire ou leur réutilisation pour une autre finalité nécessitent un accord distinct.',
    ],
  },
  {
    heading: 'Retrait de l’autorisation',
    paragraphs: [
      'Je peux retirer mon autorisation en adressant une demande écrite au bureau du club. Le club cesse alors les nouvelles utilisations et retire les contenus concernés des supports numériques qu’il contrôle. Les documents imprimés déjà distribués ne peuvent pas être récupérés.',
      'Mon refus ou le retrait de mon autorisation n’empêche ni mon adhésion ni ma participation aux activités du club.',
      'Pour un mineur, l’autorisation doit être recueillie auprès de ses représentants légaux.',
    ],
  },
]

export const IMAGE_RIGHTS_CONSENT_LABEL =
  'J’autorise l’AS Caribbean à me photographier ou me filmer et à utiliser mon image dans les conditions ci-dessus.'
export const IMAGE_RIGHTS_REFUSAL_LABEL = 'Je n’autorise pas ces utilisations de mon image.'
