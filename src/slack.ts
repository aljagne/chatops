import type { Handler } from '@netlify/functions';

import { parse } from 'querystring';
import { blocks, modal, slackApi, verifySlackRequest } from './util/slack';
import { saveItem } from './util/notion';

async function handleSlashCommand(payload: SlackSlashCommandPayload) {
	switch (payload.command) {
		case '/dabisassist':
			const response = await slackApi(
        "views.open",
        modal({
          id: "dabisassist-modal",
          title: "Start a dabis assist!",
          trigger_id: payload.trigger_id,
          blocks: [
            blocks.section({
              text: "Let the discourse ignite with your spiciest brand marketing takes! *Send in your boldest marketing opinions and let's engage in lively discussions that make us feel alive.*",
            }),
            blocks.input({
              id: "opinion",
              label:
                "Feel free to start by sharing your opinion on a particular project or topic here.",
              placeholder:
                "Example: Using bright neon colors in our brand marketing project will attract more customers!",
              initial_value: payload.text ?? "",
              hint: "What do you believe about the project that people find not appalling? Don't hold back - say it with your chest!",
            }),
            blocks.select({
              id: "opinion_spice_level",
              label: "Opinion Flavor",
              placeholder: "Select an opinion flavor",
              options: [
                { label: "subtle", value: "subtle" },
                { label: "bold", value: "blod" },
                { label: "fiery", value: "fiery" },
                { label: "explosive", value: "explosive" },
              ],
            }),
          ],
        })
      );

			if (!response.ok) {
				console.log(response);
			}

			break;

		default:
			return {
				statusCode: 200,
				body: `Command ${payload.command} is not recognized`,
			};
	}

	return {
		statusCode: 200,
		body: '',
	};
}

async function handleInteractivity(payload: SlackModalPayload) {
	const callback_id = payload.callback_id ?? payload.view.callback_id;

	switch (callback_id) {
		case 'dabisassist-modal':
			const data = payload.view.state.values;
			const fields = {
        opinion: data.opinion_block.opinion.value,
        spiceLevel:
          data.opinion_spice_level_block.opinion_spice_level.selected_option
            .value,
        submitter: payload.user.name,
      };

			await saveItem(fields);

			await slackApi("chat.postMessage", {
        channel: "C038WQP0L48",
        text: `Oh dang, y’all! :eyes: <@${payload.user.id}> just started a discussion assist with a ${fields.spiceLevel} take:\n\n*${fields.opinion}*\n\n...discuss.`,
      });
			break;

		case 'start-dabis-assist-nudge':
			const channel = payload.channel?.id;
			const user_id = payload.user.id;
			const thread_ts = payload.message.thread_ts ?? payload.message.ts;

			await slackApi('chat.postMessage', {
				channel,
				thread_ts,
				text: `Hey <@${user_id}>, an opinion like this one deserves a heated public debate. Run the \`/dabisassist\` slash command in a main channel to start one!`,
			});

			break;

		default:
			console.log(`No handler defined for ${payload.view.callback_id}`);
			return {
				statusCode: 400,
				body: `No handler defined for ${payload.view.callback_id}`,
			};
	}

	return {
		statusCode: 200,
		body: '',
	};
}

export const handler: Handler = async (event) => {
	const valid = verifySlackRequest(event);

	if (!valid) {
		console.error('invalid request');

		return {
			statusCode: 400,
			body: 'invalid request',
		};
	}

	const body = parse(event.body ?? '') as SlackPayload;

	if (body.command) {
		return handleSlashCommand(body as SlackSlashCommandPayload);
	}

	// TODO handle interactivity (e.g. context commands, modals)
	if (body.payload) {
		const payload = JSON.parse(body.payload);
		return handleInteractivity(payload);
	}

	return {
		statusCode: 200,
		body: 'TODO: handle Slack commands and interactivity',
	};
};
