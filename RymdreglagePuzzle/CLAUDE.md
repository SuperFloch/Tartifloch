# Rymdreglage Puzzle

Outil d'enregistrement et d'analyse d'une grande énigme proposée par Rymdreglage (duo suédois).
Objectif : aider l'utilisateur à trouver la solution du puzzle.

## Structure du puzzle
- 1024 dossiers (playlists), chacun avec 99 fichiers mp3 et 1 image.
- Toutes les images ont la même structure (exemple : `Miniatures/0030.jpg`).
- `data/` : description de chaque élément de l'image de chaque dossier.
- `filesRefs/` : noms des mp3 de chaque dossier.
- `json/` : autres JSON (trop nombreux).
- `everything.js` / `everything.json` : agrégat de tout (~8,8 Mo, ~160 000 lignes).
- `analyzeScript.js` : script node d'analyse (lit `everything.json`, `.playlists`, champ `img.snakeCode`, etc.).
- Références visuelles : `referenceSignes.jpg`, `gridRef.png`, `pictureRef.jpg`, `miniatureJsonNaming.jpg`.

## RÈGLES IMPORTANT (économie de tokens)
- NE PAS lire/analyser les JSON de `data/`, `filesRefs/`, `json/`, ni `everything.js` / `everything.json`.
- Faire les analyses via des scripts node (ex. `analyzeScript.js`) et n'afficher que les résultats agrégés.

## Observations de l'utilisateur
### Images
- Plusieurs images différentes peuvent avoir la même combinaison (Chapeau/Yeux/Humain/Sourire = CYHS).
- Exactement 32 numéros soulignés (puissance de 2).
- 26 caractères "serpent" différents -> probablement un alphabet déguisé.
- 96 combinaisons CYHS, toutes représentées. Seules 149 et 725 ont une combinaison unique.
- 12 couleurs de grille différentes (12 * 8 == 96, piste à explorer).

### Titre chiffré des musiques
- La 1re piste de chaque playlist est une série de nombres : 8 nombres pour 0-729, 7 pour 730-1009, 6 pour 1010-1023.
- Playlist 392 : la série est en 2e piste au lieu de la 1re.
- Les séries sont soit croissantes (entiers), soit des décimaux décroissants.

### Titres des chansons
- Forme "Nom Prénom {verbe} complément".
- Beaucoup de noms sont des musiciens (John Williams, John Murphy, Samuel Kim, John Powell...).
- Nom + prénom à prendre ensemble (ensembles cohérents, pas de générateur aléatoire).
- Presque tous les noms de famille reviennent exactement 200 fois.

## Infos du README.txt
- Message des créateurs : Crypzzle de Tomas et Daniel (Rymdreglage). Récompense >= 10000 USD. 1024 dossiers numérotés 1 à 1024, 99 MP3 + 1 JPG chacun. Les instructions "à faire si résolu" sont dans le Crypzzle lui-même. Durée totale des MP3 : 5903 h 8 min 54 s. Pas de compétences spéciales requises (~10 ans d'école). Il faudra montrer exactement comment on a résolu. Tomas est le seul à connaître la solution. Sert aussi de benchmark pour IA.
- SnakeChars douteux (ambiguïté Q/R dans snakeCode) : ids 3, 55, 779.
- Miniatures douteuses (hat/eye/mouth incertains, jamais "human") : 83, 150, 237*, 238*, 239*, 240*, 242*, 243*, 246*, 283*, 338, 355, 374*, 391, 503, 519, 570*, 602, 611*, 640, 651*, 712, 742*, 743, 751, 807, 821, 871, 932*, 951, 994, 999, 1011*, 1016 (* = yeux fermés). Constantes dans analyzeScript.js.

## Découpage en blocs de 16 ids (fonctions blockSummary, blockHeaderSymbols, blockPatternSequence)
Bloc k = ids 16k..16k+15 (id 16k = en-tête à grille pleine ; bloc 0 = ids 1-15, bloc 64 = id 1024 seul).
- Motif de grille d'un bloc = 7 bits (ids pairs, 3 vs 5 cases) + 8 positions 0-7 (ids impairs). Il n'existe que **8 motifs distincts**, chacun présent **exactement 8 fois** sur les 64 blocs (8 x 8 = 64) ; les blocs 62 et 63 ont une variante du motif 6 (bits 1111000 au lieu de 1110000, probablement faute de lecture : 6+2 = 8). Motifs : 0=0101001/62631514, 1=0111001/27613523, 2=1100011/00326132, 3=1011001/71321677, 4=1010011/23044610, 5=0011101/21035570, 6=1110000/16207153, 7=0011010/10472373.
- Suite des motifs par bloc (0 à 63) : 0123450536137610150207523637314430544667470152712043554272261766 (les deux derniers lus 8 -> 6).
- Couleur de grille du corps du bloc : 8 couleurs (gris, cyan, blanc, magenta, jaune, rouge, vert, bleu) ; en-tête : surtout vert/jaune/rouge/bleu + quelques quasi-noirs (#060500 bloc 22, #34330e bloc 45, #fd0100 bloc 36, #fcfb19 bloc 57). Ni le motif ni la couleur d'en-tête ne déterminent la couleur du corps (aucune dépendance visible).
- Fond : teinte = 60° + 3,75° x bloc (60° au bloc 0, 300° au bloc 64).
- Longueur des séries : 8 jusqu'au bloc 45, 7 du bloc 45 à 62, 6 aux derniers blocs.
- Nombres soulignés : un par bloc dans le dernier tiers (blocs 45-63, ids 727-1016), 1 à 2 par bloc.

## Erreurs de saisie probables
Liste des ids à vérifier : toCheck.txt (régénérer avec `node analyzeScript.js writeToCheck`, détection dans `findSuspects`). Catégories : nombre (img.number), grille (cases/couleur), motif de bloc rare, snakeCode vide/rare, soulignés irréguliers, mots de name uniques.

## Audio
- Je ne peux pas écouter : analyse par signal uniquement. Script : `python -I analyzeAudio.py "<fichier.mp3>" [dossier_sortie]` (ffmpeg + numpy ; spectrogramme + pics + bandes + modulations). Exemple dans audios/ (id 2, 210 s, mp3 128 kb/s 48 kHz stéréo).
- Résultats sur cet exemple : drone / nappe ambient. Énergie surtout < 500 Hz, quasi rien > 8 kHz (aucun contenu ultrasonique), stéréo très large (corrélation L/R ~0,05). Pics dominants D#3 (157 Hz), F#2 (92), A#2 (117), D#2 (78), F#4 (371), A#4 (467) -> accord de ré dièse mineur. Raies harmoniques régulières, respiration lente (périodes ~35-42 s), quelques tenues autour de 4 kHz (~63-73 s et ~95-100 s). Compatible avec un son très étiré, mais rien de concluant.

## Majuscules dans name (fonction capitalLetterCounts)
A 651, B 147, C 379, D 158, E 25, F 103, G 26, H 1, I 92, M 1332, O 27, P 27, R 340, S 396, T 28, W 26 (seulement 16 lettres, total 3758 = toutes les initiales de mots). 12 mots sans majuscule : "for" x10, "to", "music". Fonction nameInitials pour les initiales par playlist.

## Notes sur les données et les images
- Une partie des textes a été lue avec une vieille version de Tesseract.js : fautes de frappe probables dans img.number.
- Les images ne sont pas toutes versionnées : seules les 56 premières sont dans Miniatures/ (0001.jpg ... 0056.jpg). On peut y vérifier visuellement une valeur douteuse.
- Les snakeCodes vides sont des défaillances du script de décodage (pas une information).

## Éléments d'une image
- backgroundColor : couleur de fond.
- Haut gauche : img.number (img.underlined = souligné).
- Haut droite : numéro de dossier id (img.idUnderlined = souligné).
- Haut centre : titre (name).
- Centre : personne (2 possibles, human), chapeau (hat : 0,1,2,4,8,16,32,64), yeux (eye ; invisibles = lunettes teintées ou yeux fermés), bouche (mouth : "/" ouverte, "." neutre, "_" sourire).
- Bas gauche : snakeCode, symboles faits de barres : "'" horizontale haute, "." horizontale basse, "|" verticale. Deux "'" ou "." consécutifs = barre plus longue.
- Bas milieu : mot "Cryppzle" + 7 carrés de couleur (img.colors).
- Bas droite : grille 4x4 (img.grid.color = fond, img.grid.code = cases 0 (vide) à 8, 8 symboles possibles).

## Tableau récapitulatif : élément d'image -> observations
| Élément (champ) | Observations | Pistes / à faire |
|---|---|---|
| backgroundColor | Dégradé continu de teinte : h=60° à l'id 1, +15° tous les 64 ids, 285° à l'id 961 ; S=100 %, L=50 % ; pas max RGB entre ids consécutifs = 5. Aucun lien trouvé avec les carrés. | Comparer teinte du fond / teintes des 7 carrés ; vérifier l'id où la teinte se boucle |
| img.number (haut gauche) | 10 chiffres dans 996 cas ; autres = fautes d'OCR (vieux Tesseract.js : ex. id 31 lu "4263'I29860", réel 4263129860, vérifié sur Miniatures/0031.jpg). Pas de motif dans les chiffres (fréquences, sommes, mod 1024). | Corriger les fautes (ids ~600-710 surtout) puis ré-analyser |
| img.underlined | 32 numéros soulignés (2^5) : ids 9,21,50,61,192,246,314 puis 727 à 1016 avec un écart régulier ~12,3. | Lien avec la régularité 727-1016 ? Autres éléments des ids soulignés ? |
| id (haut droite) / idUnderlined | 4 ids soulignés : 224, 423, 512, 686. | Rien trouvé |
| name (titre) | 965 noms distincts ; "Music" 1013, "Meditation" 294, "Ambient" 293 ; faute "Realxing" x40 ; plusieurs mots exactement 26 fois (Dark, Dystopian, Gaming, Reading, Outer, Deepest, Sleep...). | Lien des 26 mots avec 26 lettres du snakeCode ? Position dans les ids |
| picture.hat | Valeurs 0,1,2,4,8,16,32,64 : 118,148,174,164,134,126,86,74 (non uniforme). | Hat = puissances de 2 : somme/XOR avec autres éléments ? |
| picture.eye / mouth / human | 2 personnes (human), bouche / . _ ; 96 combinaisons CYHS, toutes présentes, 149 et 725 uniques. | Doutes README (yeux fermés) |
| snakeCode | 26 caractères distincts, 2 à 6 par mot, 148 mots distincts (8 mots = 436 playlists). 18 codes vides (ids 407,451,463,482,490,495,498,522,681,763,764,783,798,799,816,822,826,861) = probablement défaillance du script de décodage, à ignorer. Ne dépend pas du hat/grille/name. Doutes Q/R : ids 3, 55, 779. | Ordre des mots par id ; clé (mot suédois/anglais) |
| grid.code | Ids impairs : 1 case, position 0-7 (3 bits). Ids pairs : 3 cases (ligne) ou 5 (croix) = 1 bit. Multiples de 16 : grille pleine, symboles 1-7 (jamais 8). Exceptions : ids pairs à 1 case 156,220,412,604,620,956,1004,1020 ; 15/14 cases : 272, 688, 352. | Convertir en octets / texte ; analyser les 64 grilles pleines (1024 symboles) |
| grid.color | #808080 (gris) sauf blocs d'ids : 16 #00ff01, 32 #ffff00, 33-47 #00ffff, 48 #ffff00, 49-63 #ffffff, 64 #fe0000, 80 #0000fe, 81-95 #ff00fe... 12 couleurs au total (12*8=96 ?). | Cartographier les blocs de couleur par id |
| colors (7 carrés) | 7168 carrés, 1637 couleurs distinctes, #eb9e4c 179 fois, ~87 niveaux par canal ; 40 blocs avec un doublon interne. | Lien avec fond / grid.color ? |
| songs[0] (série chiffrée) | 8 nombres (ids 1-730), 7 (731-1010), 6 (1011-1024). Id 393 : série en position 1. Seulement 8 séries croissantes (le reste non monotone). | Revoir la lecture des décimaux |
| songs[1..] (titres) | "Prénom Nom Verbe complément" ; 97 titres par playlist (98 entrées). Noms de famille loin de 200 chacun avec un split naïf. | Affiner le découpage prénom/nom |

## Format de everything.json (playlists[i])
{ id (string, 1-based), img{number, snakeCode, underlined, idUnderlined, picture{hat,eye,human,mouth}, grid{code,color}, colors[7], backgroundColor}, name, songs[98] }.
songs[0] = série chiffrée (la playlist d'id "393" l'a en position 1), puis 97 titres "Prénom Nom Verbe ...". Attention : 98 entrées dans songs pour 99 mp3.

## analyzeScript.js
Utilisation : node analyzeScript.js <fonction> [args] (sans argument : liste des fonctions, table CLI). Toujours ajouter les nouvelles fonctions de recherche dans ce fichier ET dans la table CLI.
Résultats déjà obtenus :
- Longueur des séries : 6 -> 14 playlists, 7 -> 280, 8 -> 730. Tendance : seulement 8 séries croissantes, 1016 "mixed" (l'affirmation croissant/décroissant est à revérifier).
- Hats : 0:118, 1:148, 2:174, 4:164, 8:134, 16:126, 32:86, 64:74.
- snakeCode : 26 caractères serpent (+ 18 codes vides), mots de 2 à 6 caractères, seulement 148 mots distincts (8 mots couvrent 436 playlists). Un mot ne détermine pas hat/human/grille/name (association faible). Table de fréquence : fonctions snake*.
- name : 965 noms distincts. "Music" (1013), "Meditation" 294, "Ambient" 293, "Relaxing" 223... Faute "Realxing" x40. Beaucoup de mots (Dark, Dystopian, Gaming, Reading, Outer, Deepest, Sleep...) apparaissent exactement 26 fois.
- backgroundColor : dégradé continu de teinte (HSL h=60 pour id 1, +15 deg tous les 64 ids, 285 deg à l'id 961), saturation 100, luminosité 50, pas max entre playlists consécutives = 5 (RGB cumulé).
- Carrés (img.colors) : 1637 couleurs distinctes sur 7168, #eb9e4c 179 fois, ~87 niveaux par canal ; 40 blocs ont un doublon interne.
- Grille : symboles 1 à 7 seulement (jamais 8). 520 grilles à 1 case, 206 à 3 cases ("0000/0000/0111/0000"), 234 à 5 cases ("0000/0010/0111/0010"), 64 grilles (id multiple de 16, aussi 1 grille à 14 et 2 à 15 cases) quasi pleines. Forme selon la parité de l'id : id impair -> 1 case, id pair -> 3 ou 5 cases. Couleur de grille #808080 sauf par blocs d'ids (16 : #00ff01, 32 : #ffff00, 33-47 : #00ffff, 48 : #ffff00, 49-63 : #ffffff, 64 : #fe0000, 80 : #0000fe...) : structure de type compteur/binaire sur l'id.
- Grille décodée : id impair -> 1 seule case (symbole 1) en position 0-7 (3 bits, jamais 8-15) ; id pair -> 3 cases (ligne centrale) ou 5 cases (croix) = 1 bit ; multiples de 16 -> grille pleine avec symboles 1-7. Exceptions paires à 1 case : ids 156,220,412,604,620,956,1004,1020 ; remplissages 14/15 : ids 352, 272, 688 (à vérifier, erreurs de saisie possibles). Position/bit non corrélés aux hat/human/mouth/eye ni déterminés par id mod 2^k. Fonctions gridDecodeSimple, gridSequences, fullGridSymbols.
- Nombres soulignés (img.number, 32) : ids 9,21,50,61,192,246,314 puis 727,739,751,763,776,788,799,812,826,836,848,860,871,883,896,907,919,931,943,956,967,979,991,1003,1016 (écart ~12,3 régulier de 727 à 1016). img.number a 10 chiffres (996 cas ; les autres = OCR douteux). ids soulignés (idUnderlined) : 224, 423, 512, 686. Aucune valeur remarquable trouvée dans les nombres eux-mêmes (fréquences de chiffres, sommes de chiffres, mod 1024).
- Noms de famille (split(" ")[1] naïf) : PAS tous à 200 (Thomas/Martin 314, Wagner/Schmidt 281, beaucoup à 279, 160, 126, 98, 66...). Le découpage Prénom/Nom est à affiner (noms composés, cyrilliques).
