const { SlashCommandBuilder, RoleManager, BaseInteraction, AttachmentBuilder } = require('discord.js');
const Jimp = require('jimp');
const allItems = require('../items.json');
const allHeroes = require('../heroes.json')
const heropath = "https://www.vaingloryfire.com/images/wikibase/icon/heroes/" // + hero + .png
const itempath = "https://www.vaingloryfire.com/images/wikibase/icon/items/"// + item + .png

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
    .addStringOption(option =>
      option.setName('duplicates')
        .setDescription('How are duplicate items handeled (default smart)')
        .addChoices(
          {name: 'Allowed', value: 'yes'},
          {name: 'Smart', value: 'smart'},
          {name: 'Not allowed', value: 'no'},
        )
    )
    .addBooleanOption(option =>
      option.setName('allow5v5')
        .setDescription("Are 5v5 items allowed (default no)")
    )
    .addStringOption(option =>
      option.setName('boots')
        .setDescription('Should boots be always included? (default First)')
        .addChoices(
          {name: 'First', value: 'first'},
          {name: 'Somewhere', value: 'yes'},
          {name: 'Maybe', value: 'no'},
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    // interaction.client to access client within command
    const heroes = interaction.options.get('heroes') ? interaction.options.get('heroes').value : 1;
    const allow5v5items = interaction.options.get('allow5v5') ? interaction.options.get('allow5v5').value : false;
    const itemduplicates = interaction.options.get('duplicates') ? interaction.options.get('duplicates').value : 'smart';
    const itemboots = interaction.options.get('boots') ? interaction.options.get('boots').value : 'first';
    console.log(`random heroes:${heroes} allow5v5:${allow5v5items} duplicates:${itemduplicates} boots:${itemboots}`)

    let canvas = new Jimp(7 * 100, heroes * 110);
    
    const addImage = async (path, name, x, y, width, height) => {
      try {
        const image = await Jimp.read(`${path}${name}.png`);
        image.resize(width, height);
        canvas.composite(image, x, y);
      } catch (e) {
        canvas = new Jimp(7*100, heroes*110);
        console.log(`Error with: ${path}${name}.png`)
        console.log(e)
      }
    }

    const isSmart = (build, item, hero, boots) => {
      return (!(item.type === 'boots' && (boots || build.some(i => i.type === 'boots'))) &&
      !(item.attributes.includes('unique') && build.includes(item)) &&
      !(item.attributes.includes('lifesteal') && item.type === 'weapon' && build.some(i => i.attributes.includes('lifesteal') && i.type == 'weapon')) &&
      !(item.attributes.includes('armorbreak') && build.some(i => i.attributes.includes('armorbreak'))))
    }

    const unusedHeroes = [...allHeroes] // shallow copy
    // let selected = [];
    // Select n heroes as requested
    for (let i = 0; i < heroes; i++) {
      const index = Math.floor(Math.random() * unusedHeroes.length)
      const hero = unusedHeroes.splice(index, 1)[0];
       await addImage(heropath, hero, 0, i * 110, 100, 100);

      // Shallow copy of items
      let unusedItems = allow5v5items ?
        [...allItems] :
        [...allItems].filter(item => !item.attributes.includes("5v5"))

      // Choose boots for the build
      const bootsidx = itemboots === 'first' ? 1 :
        itemboots === 'yes' ? Math.floor(1+Math.random()*6) :
        -1
      const bootsall = unusedItems.filter(item => item.type === 'boots')
      const boots = bootsall[Math.floor(Math.random()*bootsall.length)]
      // Delete the boots from available options
      if (bootsidx > 0 && (itemduplicates === 'no' || itemduplicates === 'smart')) {
        unusedItems.splice(unusedItems.indexOf(boots), 1)
      }


      let itemsSelected = [];
      for (let itemi = 1; itemi < 7; itemi++) {
        let itemSelected = {};
        if (itemi === bootsidx) {
          itemSelected = boots;
        } else {
          const indexitem = Math.floor(Math.random() * unusedItems.length)
          itemSelected = unusedItems[indexitem]
          // IF the item we selected was duplicate/not smart, delete and try again
          if (itemduplicates === 'no' && itemsSelected.includes(itemSelected) || (itemduplicates === 'smart' && !isSmart(itemsSelected, itemSelected, "", bootsidx > 0))) {
            unusedItems.splice(indexitem, 1)
            itemi--;
            continue
          }
          // Delete the selected item from possible list of items if necessary
          if (itemduplicates === 'no' || (itemduplicates === 'smart' && itemSelected.attributes.includes("unique"))) {
            unusedItems.splice(indexitem, 1)
          }
        }

        await addImage(itempath, itemSelected.name, 5 + itemi * 100, 5 + i * 110, 95, 95);
        itemsSelected.push(itemSelected);
      }
      // selected.push(`${hero}: ${itemsSelected.join(", ")}\n`)
      //selected.push({
      //  hero: hero,
      //  items: items
      //})
    }
    // selected = selected.join(", ")
     const attachment = new AttachmentBuilder(await canvas.getBufferAsync(Jimp.MIME_PNG), { name: "randomized.png" })
    await interaction.editReply({ content:"", files: [attachment] });
    console.log("reply sent")
  },
};