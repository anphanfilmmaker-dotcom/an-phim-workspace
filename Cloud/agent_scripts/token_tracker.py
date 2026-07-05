import argparse
import sys
import json
from db_connection import execute_query

# Note: In production, this script would be used as an imported module by the agents
# to wrap their API calls. For CLI testing, we expose a direct 'log_usage' command.

# Google Gemini Pricing Example (as of mid-2024, adjust as needed)
PRICE_PER_1M_INPUT = 0.15 # USD
PRICE_PER_1M_OUTPUT = 0.60 # USD

def calculate_cost(input_tokens, output_tokens):
    """
    Calculates cost based on token usage.
    """
    cost_input = (input_tokens / 1_000_000) * PRICE_PER_1M_INPUT
    cost_output = (output_tokens / 1_000_000) * PRICE_PER_1M_OUTPUT
    return cost_input + cost_output

def log_usage(agent_id, input_tokens, output_tokens):
    """
    Updates the agents table with new token usage and costs.
    """
    cost = calculate_cost(input_tokens, output_tokens)
    
    query = """
        UPDATE agents 
        SET tokenInput = tokenInput + %s,
            tokenOutput = tokenOutput + %s,
            runCount = runCount + 1,
            totalCost = totalCost + %s
        WHERE id = %s
    """
    params = (input_tokens, output_tokens, cost, agent_id)
    
    success = execute_query(query, params, fetch=False)
    
    if success:
        return {"status": "success", "agent_id": agent_id, "cost_added": cost}
    else:
        return {"status": "error", "message": "Failed to update database"}

def main():
    parser = argparse.ArgumentParser(description="Chi Hai (Tech Agent) - Token Tracker Module")
    subparsers = parser.add_subparsers(dest="action")

    p_log = subparsers.add_parser("log_usage")
    p_log.add_argument("--agent_id", required=True, help="ID cua Agent (vd: tram-anh, minh-thu)")
    p_log.add_argument("--input_tokens", type=int, required=True, help="So luong token input su dung")
    p_log.add_argument("--output_tokens", type=int, required=True, help="So luong token output sinh ra")

    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "log_usage":
        result = log_usage(args.agent_id, args.input_tokens, args.output_tokens)
        print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
