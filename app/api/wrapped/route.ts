import { Octokit } from "octokit"
import { NextResponse } from "next/server"

// Helper to retry stats fetch if 202 (Processing)
async function fetchStatsWithRetry(octokit: Octokit, owner: string, repo: string, retries = 3): Promise<number[][] | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await octokit.request('GET /repos/{owner}/{repo}/stats/punch_card', {
        owner,
        repo
      })
      if (res.status === 200 && Array.isArray(res.data)) {
        return res.data as number[][]
      }
    } catch (e) {
      // 202 means "generating stats", 404/403 means skip
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || searchParams.get('user')

  if (!username) {
    return NextResponse.json({ error: "Username required", message: "Please provide a username parameter." }, { status: 400 })
  }

  // Check for token
  const token = process.env.GITHUB_TOKEN
  const octokit = new Octokit({ auth: token })

  try {
    // STRATEGY: Try GraphQL first if token exists (for perfect data), fallback to REST (approximate data)

    if (token) {
      try {
        console.log("Attempting GraphQL fetch...")
        const query = `
            query($login: String!) {
              user(login: $login) {
                login
                createdAt
                avatarUrl
                location
                following { totalCount }
                pullRequests(first: 1) { totalCount }
                issues(first: 1) { totalCount }
                starredRepositories(first: 50) { 
                  totalCount
                  nodes {
                    name
                    owner { login }
                    stargazerCount
                    primaryLanguage { name color }
                  }
                }
                contributionsCollection {
                  totalCommitContributions
                  totalPullRequestContributions
                  totalIssueContributions
                  totalPullRequestReviewContributions
                  contributionCalendar {
                    totalContributions
                    weeks {
                      contributionDays {
                        contributionCount
                        color
                        date
                        weekday
                      }
                    }
                  }
                  commitContributionsByRepository(maxRepositories: 5) {
                    repository { name }
                    contributions { totalCount }
                  }
                }
                repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}, ownerAffiliations: OWNER, isFork: false) {
                  totalCount
                  nodes {
                    name
                    stargazerCount
                    forkCount
                    diskUsage
                    createdAt
                    isFork
                    primaryLanguage { name color }
                    languages(first: 5) { nodes { name color } }
                    owner { login }
                  }
                }
              }
            }
            `
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gqlRes: any = await octokit.graphql(query, { login: username })
        const user = gqlRes.user

        // If we got here, GraphQL worked. Now fetch punchcard for top repos separately (REST only)
        const activityGrid = Array(7).fill(0).map(() => Array(24).fill(0))
        const topRepos = user.repositories.nodes.slice(0, 5)

        for (const repo of topRepos) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stats = await fetchStatsWithRetry(octokit, user.login, (repo as any).name)
          if (stats) {
            stats.forEach((entry) => {
              activityGrid[entry[0]][entry[1]] += entry[2]
            })
          }
        }

        // Calc peak time
        // Find peak activity time
        let maxCommits = 0
        let peakDay = 0
        let peakHour = 12

        activityGrid.forEach((hours, d) => {
          hours.forEach((count, h) => {
            if (count > maxCommits) {
              maxCommits = count
              peakDay = d
              peakHour = h
            }
          })
        });

        // If punch card fails/empty, use a default from "created_at" of recent repos or just random/mid-day
        if (maxCommits === 0) {
          peakHour = 14
          peakDay = 3
          maxCommits = 1
        }

        const mappedData = {
          login: user.login,
          createdAt: user.createdAt,
          avatarUrl: user.avatarUrl,
          location: user.location,
          following: user.following,
          pullRequests: user.pullRequests,
          issues: user.issues,
          starredRepositories: user.starredRepositories,
          contributionsCollection: user.contributionsCollection,
          repositories: user.repositories,
          activityStats: {
            peakDay,
            peakHour,
            maxCommits
          }
        }

        return NextResponse.json({ data: { viewer: mappedData } })
      } catch (gqlError) {
        console.error("GraphQL failed", gqlError)
        return NextResponse.json({ error: "Failed to fetch real data", details: "GraphQL query failed. Please ensure GITHUB_TOKEN is valid." }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Configuration Error", message: "GITHUB_TOKEN is missing. Please add it to .env.local for real data." }, { status: 401 })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("API Error:", error)
    return NextResponse.json({ error: "Failed to fetch data", details: errorMessage }, { status: 500 })
  }
}
