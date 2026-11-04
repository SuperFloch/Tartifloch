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

## Corrections vérifiées et accès aux fichiers
- Tous les fichiers du Crypzzle sont dans E:\ (E:\0001\0001.jpg, 99 mp3 par dossier nommés "0001-1 <série>.mp3", "0001-10 <titre> - <name>.mp3"..., plus E:\Crypzzle.txt = le README des créateurs).
- corrections.json : valeurs vérifiées par l'utilisateur sur les images (39 nombres img.number, 18 snakeCodes vides, token serpent de 651 et 703 = "'|.|'|.|'|."). Appliquées en mémoire au chargement par `applyCorrections()` dans analyzeScript.js (everything.json inchangé). Ajouter ici toute future correction (champs gridColors, gridCells prévus).
- Après corrections : tous les img.number ont 10 chiffres ; 27 caractères serpent distincts (au lieu de 26), dont deux à 2 occurrences seulement : "'|.|'|." (ids 407 et 822, codes identiques) et "'|.|'|.|'|." (ids 651 et 703) -> à re-vérifier (l'alphabet devrait en compter 26).
- Grilles vérifiées sur les 1024 images par checkGridImages.js : cases à point (ids non multiples de 16) et couleurs identiques au JSON, sauf couleurs 352 et 720 (jaune #ffff00 réel). Ids pairs à 1 seul point (156,220,412,604,620,956,1004,1020), ids 1000/1016 gris, blocs 62-63 : tous confirmés RÉELS (pas des erreurs). Grilles pleines corrigées (corrections.json) : 272 case (2,0)=5 ; 352 cases (1,2)=2, (2,2)=2, (3,2)=4 (et non 1) ; 688 case (1,3)=3. Décodage des symboles pleins : un symbole est un trait épais (2 vertical, 3 horizontal, 4 haut+gauche, 5 gauche+bas, 6 bas+droite, 7 haut+droite, 1 point, 8 croix) ; les traits forment un chemin continu à travers la grille.
- Soulignés 812, 826, 836 confirmés. Mots uniques de name confirmés (Realxing aussi, vraiment visible sur les images).
- checkGridImages.js : vérifie les grilles 4x4 sur les images (cases à point noir + couleur de fond) : `node checkGridImages.js [ids|all] [dossier images]`. Les grilles pleines (symboles en traits) ne sont vérifiées que pour la couleur.

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

## Cartographie des couleurs de grille (gridColorRuns, gridColorBlocks)
- 117 suites d'ids consécutifs de même couleur. Corps de bloc (15 ids non multiples de 16) : une couleur, 8 possibles = gris, bleu, vert, cyan, rouge, magenta, jaune, blanc (= 3 bits RGB, noir remplacé par gris). Chaque couleur est le corps d'exactement 8 blocs (blocs 62 et 63 : vert et cyan avec 1 id gris au milieu, ids 1000 et 1016).
- **Carré latin parfait** : chacun des 64 couples (motif de grille 0-7, couleur de corps) apparaît exactement UNE fois sur les 64 blocs (bloc 62 = motif 6 + vert, bloc 63 = motif 6 + cyan, ce qui confirme la lecture 6 des deux derniers motifs). Table (ligne=motif, colonnes gris/bleu/vert/cyan/rouge/magenta/jaune/blanc -> n° de bloc) : m0 0 20 33 18 49 6 15 42 | m1 1 29 14 47 43 60 16 10 | m2 48 19 45 2 55 57 23 58 | m3 8 26 51 28 32 24 11 3 | m4 4 50 35 31 40 30 54 36 | m5 34 17 53 52 44 5 7 22 | m6 13 25 62 63 38 59 9 37 | m7 56 39 27 61 12 41 21 46. => le message est dans l'ORDRE des 64 blocs (permutation) ou 6 bits par bloc (3 motif + 3 couleur), 64 blocs = 64 x 6 bits.
- Un « motif » = les 15 grilles du corps d'un bloc (ids 16k+1..16k+15) : 8 positions de point (ids impairs, 0-7) + 7 bits ligne/croix (ids pairs). Les numéros m0..m7 sont des étiquettes arbitraires (ordre de 1re apparition). Image : Motifs.png (`node motifsImage.js`).
- En-têtes (id 16k, k=1..64) : 4 couleurs seulement, NON équilibrées : vert 13, jaune 17, rouge 19, bleu 15 (576 #fd0100 = rouge, 912 #fcfb19 = jaune). Pas de lien avec le motif (répartition irrégulière). Id 1000 et 1016 : gris (au milieu des blocs 62/63).
- Suites de couleurs (blocs 0..63) : voir `node analyzeScript.js gridColorBlocks` et `gridColorRuns`.

## Dossier workspace/ (images générées)
- workspace/ accueille toutes les images générées : Alphabet.png (`node alphabetImage.js`), Motifs.png (`node motifsImage.js`), testMotif.png (`node testMotifImage.js [colonnes]` génère aussi testMotifCouleurs.png : même assemblage avec le fond coloré de chaque grille (img.grid.color corrigé) et l'id inscrit).
- testMotif : les 64 grilles pleines (ids 16, 32 ... 1024) concaténées en 8x8 grilles (32x32 symboles), dans l'ordre des ids. Résultat : à l'intérieur de chaque grille 4x4 les traits sont tous cohérents (après correction des cases 656 et 880, cf. ci-dessous) mais aux bords entre grilles voisines 215 liaisons cohérentes / 233 incohérentes (~50 %) : les grilles ne se raccordent PAS dans l'ordre des ids. Aucun arrangement en puzzle (sans rotation) avec bord extérieur fermé n'existe (recherche exhaustive) ; sans contrainte extérieure, non conclu en 60 s. Il n'y a AUCUN symbole « 1 » (point) dans les 64 grilles pleines : les 2 « 1 » du JSON (ids 656 et 880) sont en réalité des **demi-traits à bout arrondi** (du centre de la case vers un seul bord), absents de gridRef.png : 656 case (3,3) = trait vers la droite (code 'r', vu par l'utilisateur) ; 880 case (2,2) = trait vers le haut (code 'u', vérifié sur l'image : le trait venant de (1,2) finit en cul-de-sac au centre de la case). Codes 'u','d','l','r' ajoutés dans corrections.json (gridCells) et dans les SYM de testMotifImage.js et workspace/puzzle/index.html. Les impasses sont donc des extrémités de chemin (2 sur 64 grilles).

- workspace/puzzle/ : version interactive des 64 grilles (échange de pièces par glisser-déposer ou clic/clic, annulation, marquage des raccords incohérents, positions enregistrées). `node build.js` régénère data.js (à relancer si corrections.json change) ; `node server.js` (http://localhost:8765) écrit les positions dans workspace/puzzle/positions.json ; sans serveur, index.html ouvert directement garde les positions dans le navigateur (localStorage) et permet export/import de positions.json. Format : {saved, size:8, positions:[64 ids, ligne par ligne]}.

- **Structure des grilles pleines (vérifiée par script)** : sur les 1024 cases des 64 grilles, 1022 ont exactement 2 traits (droit ou coin) et 2 seulement en ont 1 (656 case (3,3)='r' et 880 case (2,2)='u') -> c'est UN chemin continu (labyrinthe) qui passe par les 1024 cases d'un carré 32x32, d'extrémités 656 et 880 (éventuellement + boucles fermées). Le bord extérieur de l'assemblage doit donc être fermé (aucun trait ne sort).
- Sorties de traits par côté (sans rotation) sur les 64 pièces : gauche 100, droite 117, haut 111, bas 120. Pour un assemblage 8x8 fermé SANS rotation il faudrait gauche = droite et haut = bas : impossible -> l'assemblage demande des ROTATIONS (et/ou symétries) des pièces, ou les pièces ne sont pas des carrés alignés 4x4.
- Hypothèse de l'utilisateur : 560 en coin haut-gauche (seule pièce sans sortie haut ni gauche, sans rotation). Sans rotation, avec 560 en coin et bord fermé : AUCUNE 1re ligne possible (chaînes de raccords horizontaux de 6 pièces maximum, il en faut 8) ; exhaustif.
- positions.json enregistré par l'utilisateur (2026-11-04) : anneau extérieur sans sortie vers l'extérieur (sauf 880 à gauche), mais 83 raccords internes incohérents. Avec rotations, la recherche brute (ligne par ligne ou spirale du bord, 100-240 s) n'a pas abouti (profondeur max 53 ligne par ligne, 32 en spirale) : il faut un solveur plus malin (DLX/SAT, ou contrainte de chemin unique).

- **Solveur** workspace/puzzle/solver.js (`node solver.js [--time=s] [--reflect] [--seed=n] [--out=f.json] [--check=positions.json]`) : raccords + bord fermé + chemin unique (union-find avec annulation : aucune boucle, et chemin 656-880 fermé seulement quand les 64 pièces sont posées), case la plus contrainte d'abord (MRV), redémarrages aléatoires. Orientation o = miroir*4 + quarts de tour horaires. Écrit solution.json ({positions, rotations}) si trouvé. Résultats : 900 s chacun, ~25 M de nœuds : rotations seules -> profondeur max 49/64 ; rotations + miroirs -> 55/64 ; AUCUNE solution trouvée (recherche non exhaustive, ni preuve d'impossibilité). Si le solveur épuise l'espace il l'indique ("Espace de recherche épuisé"). La page puzzle gère maintenant rotations/miroir (touches R/F, double-clic) et charge solution*.json.

## img.number après corrections (tous vérifiés)
- 1024 nombres de 10 chiffres, tous distincts (14 commencent par 0 : 102 de ids dont 10, 35, 47, ...), de 5 681 271 à 9 972 524 680 (> 2^33, < 2^34 mais sans lien visible). Statistiquement UNIFORMES/aléatoires : chiffres par position (chi2 3 à 15 pour 9 ddl), mod 2..1024, popcount binaire en cloche, somme de chiffres, corrélation avec l'id (-0,005), pas triés, XOR global 14554939398, somme 5106756987162.
- Pas de lien avec hat, eye, bouche, human, id mod 8/16, ni avec la série de nombres de songs (corr. 0,08 avec la somme). 9 sous-chaînes de 6 chiffres répétées et 14 groupes d'anagrammes : conforme au hasard.
- Les 32 soulignés ne sont pas distinguables par leurs valeurs. Piste restante : le nombre est peut-être une clé/identifiant (hash) à utiliser avec autre chose (mot serpent, texte).

## Anomalie du dossier 393 (expliquée)
- Les 98/99 pistes d'un dossier sont en fait UN SEUL enregistrement audio découpé en tranches numérotées (observation de l'utilisateur à l'écoute).
- Dossier 393 : le fichier de la tranche 32 a perdu son numéro (E:\0393\"0393-- Background Ambient Massage Music Jean Peterson Heard Enthusiastic Overture - ....mp3", trié en premier) -> erreur du concepteur. C'est pourquoi la série de nombres (tranche 1) était en songs[1] au lieu de songs[0].
- Corrigé dans filesRefs/0393.json : l'ancien songs[0] est déplacé à l'index 31 (tranche 32) ; songs[0] = série. NON répercuté dans everything.json/everything.js (qui gardent l'ancien ordre, id "393" : série en position 1 ; le titre "Background Ambient Massage Music Jean Peterson..." en position 0 = tranche 32).

## Alphabet serpent (image Alphabet.png)
- `node alphabetImage.js` génère Alphabet.svg/.png (27 caractères distincts, fréquences, ids des rares) ; `node analyzeScript.js snakeTokenIds [maxCount]` liste les ids par caractère.
- Caractères rares : `'|.|'|..|` 9x (ids 3,13,18,33,61,127,141,203,228 : tous < 230, donc probablement réel), `'|.|'|.|` 12x, `.|'|.|` 8x, `'|.|'|.|'|` 8x, `'|.|'|.|'|.|'` 8x, `'|.|'|.` 2x (407,822), `'|.|'|.|'|.` 2x (651,703). Ces deux derniers ont été vérifiés par l'utilisateur sur les images : corrects.

## Carrés de couleur (img.colors, 7 par image) : analyse approfondie
- Chaque canal R/G/B vaut 25 + 7*k avec k entier de 0 à 31 (écart au modèle <= 2 : bruit JPEG ; 32 niveaux = 5 bits par canal). Chaque carré = une valeur de 15 bits (k_R<<10 | k_G<<5 | k_B). Les 7 carrés d'une image = 105 bits.
- Distribution très NON uniforme : k=30 (#eb) sur 4101 des 21504 canaux (57 % des carrés ont un canal à 235), k=31 quasi absent (1), k=0 1380, k=4 2170, k=19 1835, k=7/8/13/14 ~1100-1300. Niveaux fréquents : 0,2,3,4,5,7,8,11,12,13,14,17,18,19,20,22,24,30.
- Seulement 943 triplets (max,mid,min) distincts ; plus fréquents (30,19,7) 208, (30,19,14) 152, (19,7,4) 127. Ressemble à des couleurs "pastel/saturées" générées à partir d'une palette (teinte x saturation x valeur), pas à des RGB tirés au hasard.
- Aucun lien statistique (chi2/ddl ~1) entre la teinte des carrés et : hat, human, mouth, eye, id mod 16, bloc, souligné, mot serpent, premier mot du name, couleur de grille, teinte du fond, position du carré (1..7). Distance moyenne entre carrés consécutifs = distance aléatoire (161 vs 160). Aucun tri (luminosité/teinte/R/G/B) des 7 carrés.
- Doublons internes : 40 images (57 attendues par hasard, léger défaut ~2 sigma). 984 images à 7 couleurs distinctes, 39 à 6, 660 à 5 (deux doublons).
- Piste : lire les 7 carrés comme 105 bits (ou 7 valeurs 0-32767), ou chaque canal k (21 valeurs 0-31 par image, 5 bits = alphabet de 32 -> lettres ?). Non testé : décodage binaire/ASCII, XOR avec img.number.

## Assemblage à forme libre, sans rotation (freeSolver.js, pathSolver.js, drawPath.js dans workspace/puzzle/)
- freeSolver.js (`node freeSolver.js [--loops]`) : pièces posées sur une grille infinie depuis 656, sans rotation/miroir, toute sortie de trait doit être reprise par la pièce voisine (aucune sortie ouverte). Espace EXPLORÉ EN ENTIER : aucun arrangement fermé (plus proche : 5 pièces, 8 sorties ouvertes), avec ou sans boucles autorisées. Cohérent avec les sommes de sorties (droite 117 != gauche 100, haut 111 != bas 120) : un ensemble fermé sans rotation est impossible.
- pathSolver.js : chemin libre 656 -> 880 (seul le chemin doit être continu, les autres traits des pièces peuvent rester ouverts). Plus court chemin = 4 pièces : 656 (0,0) -> 352 (1,0) -> 208 (2,0) -> 880 (2,-1) (x = colonne, y = ligne). Image workspace/solutionChemin.png (`node drawPath.js path.json solutionChemin` : chemin en rouge, sorties sans partenaire en orange).
- longPath.js (`node longPath.js [--time=120] [--from=656] [--seed=n] [--out=long.json]`) : seule la continuité du chemin compte (chaque pièce est traversée par un trait qui entre et ressort, les autres traits peuvent rester ouverts), sans rotation. Résultat : chemin de **61 pièces qui relie 656 à 880** (long.json, clé "end"), et 62 pièces maximum si on ne vise pas l'autre bout (5 graines, mêmes maxima : probablement le plafond). Image workspace/cheminLong.png (fond vert, chemin en rouge, `node drawPath.js long.json cheminLong end "#2e9e3e"`). Chemin ORDONNÉ = ids dans l'ordre du chemin (long.json "end") : piste pour lire un message.
