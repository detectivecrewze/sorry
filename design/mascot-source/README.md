# Brown Bear mascot source

The identity anchor was generated with built-in ImageGen from the existing bunny as a style reference, not as an edit target. The eight production images were each generated in a separate built-in ImageGen call with the anchor as their identity reference.

Shared identity prompt:

> Use the referenced image only as the exact character identity and visual style reference. Create the exact same small warm caramel-brown bear mascot: same round proportions, cream muzzle and belly, rounded ears, short masculine forelock, slightly defined eyebrows, cocoa-brown bow tie, dark brown paw pads, polished soft 2D romantic illustration, consistent lighting and line thickness. Square composition, full body centered, clean transparent alpha background. No text, no frame, no scenery, no floor, no watermark, no extra character.

Pose prompts:

- Question 1: nervous and shy, eyes open, worried brows, paws clasped near the mouth/chest, tiny tear shine.
- Question 2: eyes closed, two small tears, paws clasped tightly, head bowed, ears lowered.
- Accepted 1: jumping with joy, paws raised, bright open eyes, small floating hearts.
- Accepted 2: landed in a playful seated crouch, laughing with eyes closed, shifted hearts.
- Waiting 1: seated, holding a pink heart, sad but hopeful, open glossy eyes.
- Waiting 2: seated, hugging the heart closer, eyes closed, one tiny tear.
- Promise 1: standing and embracing an oversized pink heart, sincere open eyes.
- Promise 2: squeezing the oversized heart, eyes closed, peaceful smile.

Production sprites are 640×640 transparent WebP files under `public/assets/mascots/brown-bear/`, each below 100 KB. The PNG in this directory is the unoptimized identity anchor and is not shipped in the public build.
