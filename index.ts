import { exit } from 'node:process';

import { error, getInput } from '@actions/core';
import { context } from '@actions/github';
import {
  DescribeImageReplicationStatusCommand,
  ECRClient,
  ReplicationStatus,
} from '@aws-sdk/client-ecr';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';

const getInputRequired = (name: string) =>
  getInput(name, {
    required: true,
  });

(async () => {
  const imageDigest = getInput('image_digest');
  const imageTag = getInput('image_tag');
  const repositoryUri = getInput('repository_uri');
  let repositoryName = getInput('repository_name');
  let registryId = getInput('registry_id');
  let region = getInput('region');

  if (imageDigest === '' && imageTag === '') {
    throw new Error('Either image_digest or image_tag is required.');
  }

  if (repositoryUri === '' && repositoryName === '') {
    throw new Error('Either repository_id or repository_name is required.');
  }

  if (repositoryUri !== '') {
    const match =
      /^(?<registry>\d+).dkr.ecr.(?<region>[^.]+).amazonaws.com\/(?<repo>.+)$/.exec(
        repositoryUri,
      );

    if (match === null) {
      throw new Error(
        'Invalid repository URI pattern. Expected <registry>.dkr.ecr.<region>.amazonaws.com/<repository>',
      );
    }

    repositoryName = match.groups['repository'];
    registryId = match.groups['registry'];
    region = match.groups['region'];
  }

  const octokit = new Octokit({
    baseUrl: context.apiUrl,
    auth: getInputRequired('token'),
    request: {
      fetch,
    },
  });

  const ecr = new ECRClient({
    region: region !== '' ? region : undefined,
  });

  const command = new DescribeImageReplicationStatusCommand({
    repositoryName,
    registryId,
    imageId: {
      imageDigest: imageDigest !== '' ? imageDigest : undefined,
      imageTag: imageTag !== '' ? imageTag : undefined,
    },
  });

  while (true) {
    console.log('🔄 Retrieving image replication statuses');

    const response = await ecr.send(command);

    let conclusion: ReplicationStatus = 'COMPLETE';
    for (const status of response.replicationStatuses) {
      switch (status.status) {
        case 'IN_PROGRESS':
          conclusion = 'IN_PROGRESS';
          break;

        case 'COMPLETE':
          console.log(
            `✅ ${status.region} / ${status.registryId}: Image replication complete`,
          );
          break;

        case 'FAILED':
          throw new Error(
            `❌ ${status.region} / ${status.registryId}: Image replication failed: ${status.failureCode}`,
          );
      }
    }

    if (conclusion === 'COMPLETE') {
      break;
    }

    console.log('⏳ Retrying in 3 seconds');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log('✅ All image replications has been completed.');
})()
  .then()
  .catch((e) => {
    error(e);
    exit(1);
  });
