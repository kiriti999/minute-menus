/** Build a Pexels CDN URL (same format as juice menu items). */
export const pexelsImage = (id: number, file = `pexels-photo-${id}.jpeg`): string =>
    `https://images.pexels.com/photos/${id}/${file}?auto=compress&cs=tinysrgb&w=800`;

/** Build an Unsplash CDN URL (used when Pexels IDs are unreliable for a dish). */
export const unsplashImage = (id: string): string =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

/** Visually verified dish → image mapping for fresh-and-fusion salads & shakes. */
export const DISH_IMAGE_BY_NAME: Record<string, string> = {
    "Caesar Salad (Veg)": pexelsImage(2097090),
    "Caesar Salad (Chicken)": unsplashImage("1716034353309-c6066ae24c67"),
    "Tuna Salad": unsplashImage("1604909052743-94e838986d24"),
    "Mediterranean Salad": pexelsImage(1059905),
    "Egg Salad": pexelsImage(406152),
    "Grilled Chicken Salad": pexelsImage(5938, "food-salad-healthy-lunch.jpg"),
    "Tomato and Avocado Salad": pexelsImage(1213710),
    "Quinoa Avocado Salad": pexelsImage(5639361),
    "Chocolate Milk Shake": unsplashImage("1551782450-40537687757d"),
    "Chocolate Thick Shake": unsplashImage("1726039468346-2f3e0f1f5b52"),
    "Banana Milk Shake": unsplashImage("1707219811295-0f283760668b"),
    "Oat Milk Shake with Dry Fruits": unsplashImage("1685967836529-b0e8d6938227"),
};
