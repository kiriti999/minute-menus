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
			"Hair covered, clean apron, nails short and clean, no jewellery on hands.",
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
			"During service: wipe the counter and board with sanitiser between tasks and clean spills straight away.",
			"After every use: wash and sanitise knives, boards, blender jars, ice-cream scoops and tongs.",
			"Daily: clean the Nosh machine as per its instructions, wipe the grill, wipe fridge shelves, sweep and mop floors, empty bins, clean sinks.",
			"Weekly: deep clean the fridge and freezer, shelves and drains, and check equipment for wear.",
			"Keep cleaning cloths and sanitiser separate from food areas.",
		],
	},
	{
		id: "closing",
		title: "Closing",
		summary: "Leave the kitchen ready for tomorrow.",
		checklist: [
			"Label and date every prep container. Use the oldest stock first.",
			"Store raw chicken on the lowest fridge shelf, below ready-to-eat food.",
			"Do the full daily clean (see Cleaning standards) and empty the bins.",
			"Switch off the grill, Nosh machine, blenders and gas.",
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
			"Pass on customer feedback and complaints to the manager the same day.",
			"Managers review hours weekly in the owner dashboard.",
		],
	},
];
