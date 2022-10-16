const { SlashCommandBuilder, RoleManager, BaseInteraction, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const heropath = "https://www.vaingloryfire.com/images/wikibase/icon/heroes/" // + hero + .png
const itempath = "https://www.vaingloryfire.com/images/wikibase/icon/items/"// + item + .png
const captains = [
  "adagio",
  "ardan",
  "catherine",
  "churnwalker",
  "flicker",
  "fortress",
  "grace",
  "lance",
  "lorelai",
  "lyra",
  "phinn",
  "viola",
  "yates"
]
const laners = [
  "amael",
  "anka",
  "baptiste",
  "baron",
  "blackfeather",
  "caine",
  "celeste",
  "gwen",
  "idris",
  "ishtar",
  "karas",
  "kensei",
  "kestrel",
  "kinetic",
  "leo",
  "magnus",
  "malene",
  "miho",
  "reza",
  "ringo",
  "samuel",
  "san-feng",
  "saw",
  "silvernail",
  "skaarf",
  "skye",
  "varya",
  "vox",
  "warhawk"
]
const junglers = [
  "alpha",
  "glaive",
  "grumpjaw",
  "inara",
  "joule",
  "koshka",
  "krul",
  "ozo",
  "petal",
  "reim",
  "rona",
  "shin",
  "taka",
  "tony",
  "ylva"
]
const allHeroes = captains.concat(laners).concat(junglers)

const weapon = [
  "sorrowblade",
  "serpent-mask",
  "spellsword",
  "poisoned-shiv",
  "breaking-point",
  "tension-bow",
  "bonesaw",
  "tornado-trigger",
  "tyrants-monocle"
]
const crystal = [
  "shatterglass",
  "spellfire",
  "frostburn",
  "dragons-eye",
  "clockwork",
  "broken-myth",
  "eve-of-harvest",
  "aftershock",
  "alternating-current"
]
const defence = [
  "pulseweave",
  "fountain-of-renewal",
  "crucible",
  "celestial-shroud",
  "aegis",
  "capacitor-plate",
  "rooks-decree",
  "slumbering-husk",
  "metal-jacket",
  "atlas-pauldron"
]
const boots = [
  "journey-boots",
  "war-treads",
  "halcyon-chargers"
]
const utility = [
  "contraption",
  "stormcrown",
  "shiversteel"
]
const only5v5 = [
  "teleport-boots",
  "superscout-2000"
]
const allItems = weapon.concat(crystal).concat(defence).concat(boots).concat(utility)

const addImage = async (ctx, path, name, x, y, width, height) => {
  try {
    await loadImage(path + name + '.png')
      .then((image) => {
        ctx.drawImage(image, x, y, width, height)
      })
  } catch (e) {
    console.log(e)
    console.log(path + name + '.png')
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Gives a random hero with a random build')
    .addIntegerOption(option =>
      option.setName('heroes')
        .setDescription("Number of heros to roll (default 1)")
        .setMaxValue(10)
        .setMinValue(1)
    )
    .addBooleanOption(option =>
      option.setName('allow5v5')
        .setDescription("Are 5v5 items allowed (default no)")
    ), // TODO: Add options for allowing/disallowing same items, 3-4 modes. Add possibility to ban some heros
  async execute(interaction) {
    console.log("execute")
    await interaction.deferReply();
    // interaction.client to access client within command
    const heroes = interaction.options.get('heroes') ? interaction.options.get('heroes').value : 1;
    const allow5v5items = interaction.options.get('allow5v5') ? interaction.options.get('allow5v5').value : false;
    console.log(heroes)
    console.log(allow5v5items)

    const canvas = createCanvas(7 * 100, heroes * 110);
    const ctx = canvas.getContext('2d');

    const unusedHeroes = [...allHeroes] // shallow copy
    let selected = [];
    // Select n heroes as requested
    for (let i = 0; i < heroes; i++) {
      const index = Math.floor(Math.random() * unusedHeroes.length)
      const hero = unusedHeroes.splice(index, 1)[0];
       await addImage(ctx, heropath, hero, 0, i * 110, 100, 100);
      let unusedItems = [...allItems] // shallow copy
      if (allow5v5items) {
        unusedItems = unusedItems.concat(only5v5)
      }

      let items = [];
      for (let itemi = 1; itemi < 7; itemi++) {
        const indexitem = Math.floor(Math.random() * unusedItems.length)
        const item = unusedItems.splice(indexitem, 1)[0]

         await addImage(ctx, itempath, item, 5 + itemi * 100, 5 + i * 110, 95, 95);
        items.push(item);
      }
      selected.push(`${hero}: ${items.join(", ")}\n`)
      //selected.push({
      //  hero: hero,
      //  items: items
      //})
    }
    selected = selected.join("")
    console.log("almost")
     const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "randomized.png" })
    await interaction.editReply({ content: selected, files: [attachment] });
    console.log("reply sent")
    //await interaction.reply(JSON.stringify(selected));
  },
};