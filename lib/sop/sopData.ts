/**
 * Kitchen SOP content shown at /:slug/sop.
 * Starter checklists drafted from the recipe book and standard kitchen practice —
 * the owner reviews and edits them here before staff rely on them.
 */

export type SopSection = {
	id: string;
	title: string;
	summary: string;
	checklist: string[];
};

export const SOP_SECTIONS: SopSection[] = [
	{
		id: "opening",
		title: "Opening",
		summary: "Before the first order of the day.",
		checklist: [
			"Clock in by scanning your own QR badge.",
			"Wash hands, put on apron, hair cover and fresh gloves.",
			"Check the fridge (5°C or below) and freezer (−18°C or below) and note the temperatures.",
			"Check dates and labels — throw away anything expired or unlabelled.",
			"Set up stations: clean boards and knives, sanitiser bottle filled, Nosh machine and grill ready.",
			"Check packing stock: 750ml, 500ml and 300ml containers, 200ml PET bottles, 50ml dressing cups, lids, foil, thick straws, sauce sachets.",
		],
	},
	{
		id: "prep-cooking",
		title: "Prep & cooking",
		summary: "Follow the recipe book for every dish — weigh, don't guess.",
		checklist: [
			"Weigh each portion as per the recipe book (large salad vs small / medium).",
			"Chicken: marinate with Cajun spice, grill on low with the lid on, 5 min each side. Core temperature must reach at least 70°C before slicing.",
			"Paneer: cook on low flame for 2–3 min with the lid on until soft and spongy. Never let it go hard.",
			"Pasta: 80–90g dry in the electric pressure cooker with 1½ cups water for 5 min, drain, then mix into the cream base.",
			"Rajma and chickpeas: soak 8–12 hours, then 40 min on high in the pressure cooker.",
			"Tuna: open the can slightly and drain all the water or oil before use.",
			"Nosh machine dishes: cook as per the Nosh recipe.",
			"Use separate boards and knives for raw chicken and ready-to-eat food. Wash hands between the two.",
		],
	},
	{
		id: "packing-delivery",
		title: "Packing & delivery",
		summary: "Right container, right size, nothing missing.",
		checklist: [
			"Salads: large in a 750ml bowl, small / medium in a 500ml bowl. Dressing always on the side in 50ml cups.",
			"Pasta and appetizer rice items: pasta in a 500ml bowl, rice items in a 300ml bowl.",
			"Thick shakes: 300ml glass, aluminium foil, glass lid and a thick straw in the packaging.",
			"Juices and cold coffee: 200ml PET bottle. Juices go into the freezer until delivery.",
			"Check the order against the ticket: items, sizes, sauce sachets, cutlery.",
			"Seal and label every container, then hand over only after checking the order number with the rider.",
		],
	},
	{
		id: "hygiene",
		title: "Hygiene",
		summary: "Personal hygiene rules for everyone who handles food.",
		checklist: [
			"Wash hands with soap for 20 seconds: at the start of the shift, after the toilet, after touching your face, phone or bins, after handling raw chicken or eggs, and between tasks.",
			"Change gloves when torn, after raw chicken, and after any non-food task. Gloves do not replace handwashing.",
			"Wear a hair net and gloves as soon as you enter the kitchen, then scan your QR badge to clock in.",
			"Hair covered, clean apron, nails short and clean, no jewellery on hands.",
			"Hygiene and cleanliness must be followed at all times, not only during checks.",
			"No phones at the prep counter.",
			"Cover cuts with a waterproof plaster and a glove.",
			"Tell the manager before your shift if you have vomiting, diarrhoea, fever or an infected cut — do not handle food.",
			"Many dishes contain nuts, seeds, dairy, eggs or gluten. If a customer mentions an allergy, tell the manager before preparing the order.",
		],
	},
	{
		id: "cleaning",
		title: "Cleaning standards",
		summary: "Clean as you go, then a full clean at close.",
		checklist: [
			"Spray and clean as you go: wipe the counter and board with sanitiser between tasks and clean spills straight away.",
			"Wash utensils as you go — do not let them pile up in the sink.",
			"After every use: wash and sanitise knives, boards, blender jars, ice-cream scoops and tongs.",
			"Daily: clean the Nosh machine as per its instructions, wipe the grill, wipe fridge shelves, clean sinks.",
			"Daily: sweep inside and outside, and mop the kitchen floor inside.",
			"Bins: change the bin liner whenever required, never leave a bin overnight, and keep the lid closed at all times.",
			"Wash cleaning cloths regularly with soap and dry them. Keep cloths and sanitiser separate from food areas.",
			"Weekly: deep dust and clean where required, deep clean the fridge and freezer, shelves and drains, and check equipment for wear.",
			"Monthly: clean the ceiling and remove cobwebs once a month.",
		],
	},
	{
		id: "food-safety",
		title: "Food safety",
		summary: "Dating, temperatures and cooking checks — followed strictly.",
		checklist: [
			"Date every item and food without fail. This must be followed strictly for food safety.",
			"Check the temperature of food after cooking to make sure it is completely cooked.",
			"Throw away anything undated, unlabelled or expired.",
		],
	},
	{
		id: "inventory",
		title: "Inventory & stock",
		summary: "Never run out, never waste.",
		checklist: [
			"Refill stock with FIFO: first in, first out.",
			"Manage inventory of food, cleaning chemicals, packaging and so on.",
			"Keep a running list of items to order and place orders at least two days before they run out.",
		],
	},
	{
		id: "attendance-conduct",
		title: "Attendance & conduct",
		summary: "Shift rules every team member agrees to.",
		checklist: [
			"Shift timings cannot be changed without prior notice to the manager.",
			"A no-show is marked as an absence, and a penalty can apply for business loss.",
			"Absence without notice for 2 days can be treated as termination, unless it is an emergency backed by proper medical or other documents.",
			"A security deposit applies as agreed with the manager.",
		],
	},
	{
		id: "closing",
		title: "Closing",
		summary: "Leave the kitchen ready for tomorrow.",
		checklist: [
			"Label and date every prep container. Use the oldest stock first.",
			"Store raw chicken on the lowest fridge shelf, below ready-to-eat food.",
			"Refill vegetables and other prep items that the next shift will need.",
			"Do the full daily clean (see Cleaning standards), empty the bins and leave the sink clean and empty.",
			"Turn off the gas, and switch off the grill, Nosh machine and blenders.",
			"Note anything running low for the next order.",
			"Clock out by scanning your QR badge.",
		],
	},
	{
		id: "performance",
		title: "Performance",
		summary: "What good looks like on a shift.",
		checklist: [
			"Be on time and clock in and out every shift — your hours are counted from badge scans.",
			"Pack every order to the recipe-book weights so portions are consistent.",
			"Get each order ready within the prep time your manager sets.",
			"Keep waste low: weigh portions, use the oldest stock first, tell the manager about anything thrown away.",
			"Promote offline sales where possible: give customers the menu and QR code so they can order directly or subscribe.",
			"Pass on customer feedback and complaints to the manager the same day.",
			"Managers review hours weekly in the owner dashboard.",
		],
	},
];
